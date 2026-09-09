import * as React from "react"
import { useTheme } from "next-themes"
import * as SonnerPkg from "sonner"
import { CircleCheck, Info, TriangleAlert, OctagonX, Loader2 } from "lucide-react"

const Sonner = SonnerPkg.Toaster || (SonnerPkg as any).default?.Toaster || (SonnerPkg as any).default;

type ToasterProps = typeof SonnerPkg.Toaster extends React.ComponentType<infer P> ? P : Record<string, any>;

const Toaster = ({ ...props }: ToasterProps) => {
  let theme = "system";
  try {
    const themeContext = useTheme();
    if (themeContext?.theme) {
      theme = themeContext.theme;
    }
  } catch {
    theme = "system";
  }

  if (!Sonner) {
    return null;
  }

  return (
    <Sonner
      theme={theme as any}
      className="toaster group z-99999"
      icons={{
        success: CircleCheck ? <CircleCheck className="size-4" /> : undefined,
        info: Info ? <Info className="size-4" /> : undefined,
        warning: TriangleAlert ? <TriangleAlert className="size-4" /> : undefined,
        error: OctagonX ? <OctagonX className="size-4" /> : undefined,
        loading: Loader2 ? <Loader2 className="size-4 animate-spin" /> : undefined,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "cn-toast",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
export default Toaster

