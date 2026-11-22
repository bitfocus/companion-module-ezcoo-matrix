import { combineRgb } from '@companion-module/base'

export function getPresetDefinitions(self) {
	const presets = {}

	for (const input of self.CHOICES_INPUTS) {
		presets[`select_${input.id}`] = {
			type: 'simple',
			name: 'Select',
			style: {
				text: `${input.label}\\n> $(${self.label}:input_route${input.id})`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: 'select_input',
							options: {
								input: input.id,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'selected',
					options: {
						input: input.id,
					},
					style: {
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(255, 0, 0),
					},
				},
			],
		}
	}

	for (const output of self.CHOICES_OUTPUTS) {
		presets[`switch_output_${output.id}`] = {
			type: 'simple',
			name: 'Switch',
			style: {
				text: `${output.label}\\n< $(${self.label}:output_route${output.id})`,
				size: 'auto',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(0, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: 'switch_output',
							options: {
								output: output.id,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [
				{
					feedbackId: 'output',
					options: {
						output: output.id,
					},
					style: {
						color: combineRgb(0, 0, 0),
						bgcolor: combineRgb(0, 255, 0),
					},
				},
			],
		}
	}

	for (const input of self.CHOICES_INPUTS) {
		presets[`all_${input.id}`] = {
			type: 'simple',
			name: 'All',
			style: {
				text: `All\\n${input.label}`,
				size: '18',
				color: combineRgb(255, 255, 255),
				bgcolor: combineRgb(32, 0, 0),
			},
			steps: [
				{
					down: [
						{
							actionId: 'all',
							options: {
								selected: false,
								input: input.id,
							},
						},
					],
					up: [],
				},
			],
			feedbacks: [],
		}
	}

	const lastOutput = self.CHOICES_OUTPUTS[self.CHOICES_OUTPUTS.length - 1]
	presets['in-to-out'] = {
		type: 'simple',
		name: 'In to Out',
		style: {
			text: `IN1 to ${lastOutput.label}`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [
					{
						actionId: 'input_output',
						options: {
							input: '1',
							output: lastOutput.id,
						},
					},
				],
				up: [],
			},
		],
		feedbacks: [],
	}

	const structure = [
		{
			id: 'select_input',
			name: 'Select Input',
			definitions: self.CHOICES_INPUTS.map((input) => `select_${input.id}`),
		},
		{
			id: 'switch_output',
			name: 'Switch Output',
			definitions: self.CHOICES_OUTPUTS.map((output) => `switch_output_${output.id}`),
		},
		{
			id: 'all',
			name: 'All',
			definitions: self.CHOICES_INPUTS.map((input) => `all_${input.id}`),
		},
		{
			id: 'in_to_out',
			name: 'In to Out',
			definitions: ['in-to-out'],
		},
	]

	return { structure, presets }
}
