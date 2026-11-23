import { toast } from 'react-toastify';

const notifyError = (message: string) => {
  toast.error(message, { toastId: `error:${message}` });
};

const notifySuccess = (message: string) => {
  toast.success(message);
};

export const notify = {
  error: notifyError,
  success: notifySuccess,
  info: (message: string) => toast.info(message),
};
