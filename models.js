/**
 * Known models, keyed by the id stored in the config.
 * The device can't report its model name, so auto-detection matches on the port counts from `EZG STA`.
 */
export const MODELS = {
	mx44: { label: 'MX44-HAS2 (4x4)', inputs: 4, outputs: 4 },
	mx42: { label: 'MX42HS (4x2)', inputs: 4, outputs: 2 },
}

/** Used in auto mode before a device has ever been detected */
export const FALLBACK_MODEL = MODELS.mx44

export function findModelByPorts(inputs, outputs) {
	return Object.values(MODELS).find((m) => m.inputs === inputs && m.outputs === outputs)
}

export function describePorts(inputs, outputs) {
	return findModelByPorts(inputs, outputs)?.label ?? `Unknown model (${inputs}x${outputs})`
}
