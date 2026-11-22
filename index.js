import { InstanceBase, InstanceStatus, TCPHelper } from '@companion-module/base'
import { getActionDefinitions } from './actions.js'
import { getFeedbackDefinitions } from './feedbacks.js'
import { getPresetDefinitions } from './presets.js'
import { getConfigFields } from './config.js'
import { MODELS, FALLBACK_MODEL, describePorts } from './models.js'

/** How long to wait after the last line of an `EZG STA` reply before treating it as complete */
const DETECT_SETTLE_MS = 500

export default class EzcooMatrixInstance extends InstanceBase {
	constructor(internal) {
		super(internal)

		this.CHOICES_INPUTS = []
		this.CHOICES_OUTPUTS = []
		this.pollMixerTimer = undefined
		this.selectedInput = '1'
		this.outputRoute = {}

		/** Port counts collected from the `EZG STA` reply currently being received */
		this.detecting = undefined
		this.detectTimer = undefined
	}

	getConfigFields() {
		return getConfigFields(this.config)
	}

	async destroy() {
		if (this.socket) {
			this.socket.destroy()
			delete this.socket
		}

		if (this.pollMixerTimer) {
			clearInterval(this.pollMixerTimer)
			delete this.pollMixerTimer
		}

		if (this.detectTimer) {
			clearTimeout(this.detectTimer)
			delete this.detectTimer
		}
	}

	async init(config) {
		await this.configUpdated(config)
	}

	async configUpdated(config) {
		const oldConfig = this.config
		this.config = config

		this.config.model = this.config.model ?? 'auto'
		this.config.poll_interval = this.config.poll_interval ?? 60000
		this.config.port = this.config.port ?? 23

		this.applyPortCounts()

		// Only reconnect when the connection details change, so that saving the detected model doesn't reconnect
		if (!oldConfig || !this.socket || oldConfig.host !== this.config.host || oldConfig.port !== this.config.port) {
			this.initTcpSocket()
		}
		this.initPolling()
	}

	/**
	 * The port counts to use: the chosen model, or the last detected device in auto mode
	 */
	getPortCounts() {
		const model = MODELS[this.config.model]
		if (model) return model

		if (this.config.detected_inputs > 0 && this.config.detected_outputs > 0) {
			return { inputs: this.config.detected_inputs, outputs: this.config.detected_outputs }
		}

		return FALLBACK_MODEL
	}

	/**
	 * Rebuild everything which depends on the number of inputs and outputs
	 */
	applyPortCounts() {
		const { inputs, outputs } = this.getPortCounts()

		this.CHOICES_INPUTS = []
		for (let i = 1; i <= inputs; i++) this.CHOICES_INPUTS.push({ id: `${i}`, label: `IN${i}` })

		this.CHOICES_OUTPUTS = []
		for (let i = 1; i <= outputs; i++) this.CHOICES_OUTPUTS.push({ id: `${i}`, label: `OUT${i}` })

		// Keep known routes for outputs which still exist
		const oldRoute = this.outputRoute
		this.outputRoute = {}
		for (const output of this.CHOICES_OUTPUTS) {
			this.outputRoute[output.id] = oldRoute[output.id] ?? `${Math.min(Number(output.id), inputs)}`
		}

		if (Number(this.selectedInput) > inputs) this.selectedInput = '1'

		this.setActionDefinitions(getActionDefinitions(this))
		this.setFeedbackDefinitions(getFeedbackDefinitions(this))
		const { structure, presets } = getPresetDefinitions(this)
		this.setPresetDefinitions(structure, presets)
		this.initVariables()
		this.checkAllFeedbacks()
	}

	/**
	 * Track the highest numbered input and output in an `EZG STA` reply
	 */
	trackDetection(tokens) {
		if (tokens[0] === 'ADDR') {
			// The start of a status reply
			this.detecting = { inputs: 0, outputs: 0 }
		}
		if (!this.detecting) return

		const outMatch = tokens[1] === 'VS' && tokens[0].match(/^OUT(\d+)$/)
		if (outMatch) this.detecting.outputs = Math.max(this.detecting.outputs, Number(outMatch[1]))

		const inMatch = tokens[1] === 'EDID' && tokens[0].match(/^IN(\d+)$/)
		if (inMatch) this.detecting.inputs = Math.max(this.detecting.inputs, Number(inMatch[1]))

		if (this.detectTimer) clearTimeout(this.detectTimer)
		this.detectTimer = setTimeout(() => {
			delete this.detectTimer
			this.finishDetection()
		}, DETECT_SETTLE_MS)
	}

	finishDetection() {
		const detected = this.detecting
		delete this.detecting
		if (!detected || detected.inputs < 1 || detected.outputs < 1) return

		const { inputs, outputs } = detected
		const chosenModel = MODELS[this.config.model]
		if (chosenModel && (chosenModel.inputs !== inputs || chosenModel.outputs !== outputs)) {
			this.log(
				'warn',
				`Device looks like ${describePorts(inputs, outputs)}, but the config is set to ${chosenModel.label}`,
			)
		}

		if (this.config.detected_inputs === inputs && this.config.detected_outputs === outputs) return

		this.log('info', `Detected ${describePorts(inputs, outputs)}`)
		this.config = { ...this.config, detected_inputs: inputs, detected_outputs: outputs }
		this.saveConfig(this.config)

		if (!chosenModel) this.applyPortCounts()
	}

	initTcpSocket() {
		if (this.socket) {
			this.socket.destroy()
			delete this.socket
		}

		if (this.config.host) {
			this.socket = new TCPHelper(this.config.host, this.config.port, {
				reconnect_interval: 10000,
				reconnect: true,
			})
			this.socket._socket.setNoDelay(true)

			this.updateStatus(InstanceStatus.Connecting)

			this.socket.on('status_change', (status, message) => {
				this.updateStatus(status, message)
			})

			this.socket.on('error', (err) => {
				this.log('error', 'Network error: ' + err.message)
			})

			this.socket.on('connect', () => {
				this.log('info', 'Connected')
				this.sendCommmand('EZG STA') //poll current status once upon connect
			})

			let receiveBacklog = ''
			this.socket.on('data', (receivebuffer) => {
				receiveBacklog += receivebuffer
				let n = receiveBacklog.indexOf('\n')
				while (~n) {
					this.processResponse(receiveBacklog.substring(0, n))
					receiveBacklog = receiveBacklog.substring(n + 1)
					n = receiveBacklog.indexOf('\n')
				}
			})
		}
	}

	processResponse(receivebuffer) {
		if (this.config.log_responses) {
			this.log('debug', 'Response: ' + receivebuffer)
		}

		let responses = receivebuffer.toString('utf8').split(/[\r\n]+/)
		for (let response of responses) {
			if (response.length > 0) {
				let tokens = response.split(' ')
				if (this.config.log_tokens) {
					console.log('Tokens: ' + tokens)
				}
				/*
				ADDR 00
				OUT1 VS IN1
				OUT2 VS IN2
				OUT3 VS IN3
				OUT4 VS IN4
				OUT1 STREAM ON
				OUT2 STREAM OFF
				OUT3 STREAM ON
				OUT4 STREAM OFF
				OUT1 EXA EN
				OUT2 EXA DIS
				OUT3 EXA EN
				OUT4 EXA DIS
				OUT1 VIDEO1
				OUT2 VIDEO2
				OUT3 VIDEO1
				OUT4 VIDEO2
				IN1 EDID 0
				IN2 EDID 0
				IN3 EDID 0
				IN4 EDID 0
				RIP 192.168.001.001
				HIP 192.168.001.002
				NMK 255.255.255.000
				TIP 23
				DHCP 0
				MAC 00.01.02.03.04.05

				IN1 SIG STA 0
				IN2 SIG STA 1
				IN3 SIG STA 0
				IN4 SIG STA 1
				*/
				this.trackDetection(tokens)

				switch (tokens[1]) {
					case 'VS':
						this.updateRoute(tokens[0].slice(-1), tokens[2].slice(-1))
						break
				}
				this.checkAllFeedbacks()
			}
		}
	}

	sendCommmand(cmd) {
		if (cmd !== undefined) {
			if (this.socket !== undefined && this.socket.isConnected) {
				this.socket.sendAsync(cmd + '\r\n').catch((e) => {
					this.log('debug', `Send failed: ${e?.message ?? e}`)
				})
			} else {
				this.log('debug', 'Socket not connected :(')
			}
		}
	}

	initPolling() {
		// poll to pick up switch state from possible changes from controls on the unit
		// changes usually come spontaneously, polling is just a backup mechanism
		if (this.pollMixerTimer) {
			clearInterval(this.pollMixerTimer)
			delete this.pollMixerTimer
		}

		if (this.config.polled_data) {
			this.pollMixerTimer = setInterval(() => {
				this.sendCommmand('EZG STA')
			}, this.config.poll_interval)
		}
	}

	updateVariableValues() {
		// This is not the most efficient to always update everything, but we have so few it isnt a problem
		const variableValues = {}

		for (const input of this.CHOICES_INPUTS) {
			let list = ''
			for (let key in this.outputRoute) {
				if (this.outputRoute[key] == input.id) {
					list += key
				}
			}
			variableValues[`input_route${input.id}`] = list
		}

		for (const output of this.CHOICES_OUTPUTS) {
			variableValues[`output_route${output.id}`] = this.outputRoute[output.id]
		}

		this.setVariableValues(variableValues)
	}

	updateRoute(output, input) {
		if (!this.socket?.isConnected) return

		if (output == 0) {
			//all outputs
			this.CHOICES_OUTPUTS.forEach((item) => {
				this.outputRoute[item.id] = input
			})
		} else if (output in this.outputRoute) {
			this.outputRoute[output] = input
		}

		this.updateVariableValues()
	}

	initVariables() {
		const variableDefinitions = {}
		for (const item of this.CHOICES_INPUTS) {
			variableDefinitions[`input_route${item.id}`] = { name: `Input ${item.id}` }
		}
		for (const item of this.CHOICES_OUTPUTS) {
			variableDefinitions[`output_route${item.id}`] = { name: `Output ${item.id}` }
		}
		this.setVariableDefinitions(variableDefinitions)

		this.updateVariableValues()
	}
}

export const UpgradeScripts = []
