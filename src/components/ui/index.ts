/**
 * UI primitives used by the app, built on Base UI (@base-ui/react) and styled
 * with the app's semantic theme tokens.
 *
 * The look comes from the token values in `styles.css` / `themes.css`
 * (colors, `--radius`, shadows) — change those to change the app, without
 * touching these files.
 *
 * @example import { Button, Modal, useToast } from '../components/ui'
 */

/* Form */
export { Button, buttonVariants, type ButtonProps } from './Button'
export { Input } from './Input'
export { Textarea } from './Textarea'
export { SearchInput } from './SearchInput'

/* Feedback */
export { ToastProvider, useToast } from './Toast'

/* Overlay */
export { Modal, ConfirmModal } from './Modal'
