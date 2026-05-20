import { Alert, Platform } from 'react-native';

type ConfirmOpts = {
  title: string;
  message: string;
  confirmLabel: string;
  destructive?: boolean;
  onConfirm: () => void;
};

// react-native-web's Alert.alert ignores button callbacks, so route through window.confirm there.
export function confirmAction(opts: ConfirmOpts) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${opts.title}\n\n${opts.message}`)) {
      opts.onConfirm();
    }
    return;
  }
  Alert.alert(opts.title, opts.message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: opts.confirmLabel,
      style: opts.destructive ? 'destructive' : 'default',
      onPress: opts.onConfirm,
    },
  ]);
}

export function notify(title: string, message: string) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
