import { Regex } from '@companion-module/base'
import { MODELS, describePorts } from './models.js'

export function getConfigFields(config) {
	const detectedInputs = config?.detected_inputs
	const detectedOutputs = config?.detected_outputs
	const detectedText =
		detectedInputs && detectedOutputs
			? `Last connected device: ${describePorts(detectedInputs, detectedOutputs)}`
			: 'No device has been detected yet'

	return [
		{
			type: 'dropdown',
			id: 'model',
			label: 'Model',
			width: 6,
			default: 'auto',
			choices: [
				{ id: 'auto', label: 'Auto detect' },
				...Object.entries(MODELS).map(([id, model]) => ({ id, label: model.label })),
			],
		},
		{
			type: 'static-text',
			id: 'detected_info',
			label: 'Detected model',
			width: 6,
			value: detectedText,
		},
		{
			type: 'textinput',
			id: 'host',
			label: 'IP Address',
			width: 6,
			default: '192.168.0.2',
			regex: Regex.IP,
		},
		{
			type: 'number',
			id: 'port',
			label: 'IP Port',
			width: 6,
			min: 1,
			max: 65535,
			default: 23,
		},
		{
			type: 'number',
			id: 'poll_interval',
			label: 'Polling Interval (ms)',
			min: 300,
			max: 300000,
			default: 60000,
			width: 8,
		},
		{
			type: 'checkbox',
			id: 'polled_data',
			label: 'Use polled data from unit:',
			default: false,
			width: 8,
		},
		{
			type: 'checkbox',
			id: 'log_responses',
			label: 'Debug returned data:',
			default: false,
			width: 6,
		},
		{
			type: 'checkbox',
			id: 'log_tokens',
			label: 'Debug token data:',
			default: false,
			width: 6,
		},
	]
}
