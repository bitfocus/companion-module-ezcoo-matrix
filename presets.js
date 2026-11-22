import { combineRgb } from '@companion-module/base'

// Template values are strings, to match the ids of the input/output dropdowns
const INPUT_EXPR = { isExpression: true, value: '$(local:input)' }
const OUTPUT_EXPR = { isExpression: true, value: '$(local:output)' }

export function getPresetDefinitions(self) {
	const presets = {}

	presets['select_input'] = {
		type: 'simple',
		name: 'Select input X',
		style: {
			text: `IN$(local:input)\\n> $(${self.label}:input_route$(local:input))`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [{ actionId: 'select_input', options: { input: INPUT_EXPR } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'selected',
				options: { input: INPUT_EXPR },
				style: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(255, 0, 0),
				},
			},
		],
		localVariables: [{ variableType: 'simple', variableName: 'input', startupValue: '1' }],
	}

	presets['switch_output'] = {
		type: 'simple',
		name: 'Switch output X to selected input',
		style: {
			text: `OUT$(local:output)\\n< $(${self.label}:output_route$(local:output))`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [{ actionId: 'switch_output', options: { output: OUTPUT_EXPR } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'output',
				options: { output: OUTPUT_EXPR },
				style: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(0, 255, 0),
				},
			},
		],
		localVariables: [{ variableType: 'simple', variableName: 'output', startupValue: '1' }],
	}

	presets['all'] = {
		type: 'simple',
		name: 'All outputs to input X',
		style: {
			text: `All\\nIN$(local:input)`,
			size: '18',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(32, 0, 0),
		},
		steps: [
			{
				down: [{ actionId: 'all', options: { selected: false, input: INPUT_EXPR } }],
				up: [],
			},
		],
		feedbacks: [],
		localVariables: [{ variableType: 'simple', variableName: 'input', startupValue: '1' }],
	}

	presets['input_output'] = {
		type: 'simple',
		name: 'Input X to output Y',
		style: {
			text: `IN$(local:input)\\nto OUT$(local:output)`,
			size: 'auto',
			color: combineRgb(255, 255, 255),
			bgcolor: combineRgb(0, 0, 0),
		},
		steps: [
			{
				down: [{ actionId: 'input_output', options: { input: INPUT_EXPR, output: OUTPUT_EXPR } }],
				up: [],
			},
		],
		feedbacks: [
			{
				feedbackId: 'input_output',
				options: { input: INPUT_EXPR, output: OUTPUT_EXPR },
				style: {
					color: combineRgb(0, 0, 0),
					bgcolor: combineRgb(0, 255, 0),
				},
			},
		],
		localVariables: [
			{ variableType: 'simple', variableName: 'input', startupValue: '1' },
			{ variableType: 'simple', variableName: 'output', startupValue: '1' },
		],
	}

	const structure = [
		{
			id: 'select_input',
			name: 'Select Input',
			definitions: [
				{
					id: 'select_input',
					type: 'template',
					name: '',
					presetId: 'select_input',
					templateVariableName: 'input',
					templateValues: self.CHOICES_INPUTS.map((input) => ({ name: `Select ${input.label}`, value: input.id })),
				},
			],
		},
		{
			id: 'switch_output',
			name: 'Switch Output',
			description: 'Route the selected input to an output',
			definitions: [
				{
					id: 'switch_output',
					type: 'template',
					name: '',
					presetId: 'switch_output',
					templateVariableName: 'output',
					templateValues: self.CHOICES_OUTPUTS.map((output) => ({
						name: `Switch ${output.label}`,
						value: output.id,
					})),
				},
			],
		},
		{
			id: 'all',
			name: 'All',
			definitions: [
				{
					id: 'all',
					type: 'template',
					name: '',
					presetId: 'all',
					templateVariableName: 'input',
					templateValues: self.CHOICES_INPUTS.map((input) => ({
						name: `All outputs to ${input.label}`,
						value: input.id,
					})),
				},
			],
		},
		{
			id: 'in_to_out',
			name: 'In to Out',
			definitions: self.CHOICES_OUTPUTS.map((output) => ({
				id: `in_to_out_${output.id}`,
				type: 'template',
				name: output.label,
				presetId: 'input_output',
				templateVariableName: 'input',
				templateValues: self.CHOICES_INPUTS.map((input) => ({
					name: `${input.label} to ${output.label}`,
					value: input.id,
				})),
				commonVariableValues: { output: output.id },
			})),
		},
	]

	return { structure, presets }
}
