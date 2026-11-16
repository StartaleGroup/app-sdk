import {
	ActionType,
	AnalyticsEventImportance,
	ComponentType,
	logEvent,
} from '../logEvent.js'

type DialogContext = 'popup_blocked'

export const logDialogShown = ({
	dialogContext,
}: {
	dialogContext: DialogContext
}) => {
	logEvent(
		`dialog.${dialogContext}.shown`,
		{
			action: ActionType.render,
			componentType: ComponentType.modal,
			dialogContext,
		},
		AnalyticsEventImportance.high,
	)
}

export const logDialogDismissed = ({
	dialogContext,
}: {
	dialogContext: DialogContext
}) => {
	logEvent(
		`dialog.${dialogContext}.dismissed`,
		{
			action: ActionType.dismiss,
			componentType: ComponentType.modal,
			dialogContext,
		},
		AnalyticsEventImportance.high,
	)
}

type GenericDialogAction = 'confirm' | 'cancel'

export const logDialogActionClicked = ({
	dialogContext,
	dialogAction,
}: {
	dialogContext: DialogContext
	dialogAction: GenericDialogAction
}) => {
	logEvent(
		`dialog.${dialogContext}.action_clicked`,
		{
			action: ActionType.click,
			componentType: ComponentType.button,
			dialogContext,
			dialogAction,
		},
		AnalyticsEventImportance.high,
	)
}
