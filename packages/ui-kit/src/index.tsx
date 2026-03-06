import type { PropsWithChildren } from "react";

export function ShellCard(props: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <section style={{ border: "1px solid #d1d5db", borderRadius: 12, padding: 16, background: "#ffffff" }}>
      <h2 style={{ margin: 0, fontSize: 18 }}>{props.title}</h2>
      {props.description ? <p style={{ color: "#4b5563" }}>{props.description}</p> : null}
      <div>{props.children}</div>
    </section>
  );
}

