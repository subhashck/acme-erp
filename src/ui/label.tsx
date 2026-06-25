import * as React from "react";

export function Label(props: React.ComponentProps<"label">) {
  return <label className="mb-1.5 block text-xs font-medium uppercase text-muted-foreground" {...props} />;
}
