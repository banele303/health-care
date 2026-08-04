import { Toaster } from "sonner";
import { useTheme } from "./theme";

const ToastProvider = () => {
  const { theme } = useTheme();
  return <Toaster theme={theme} />;
};

export default ToastProvider;
