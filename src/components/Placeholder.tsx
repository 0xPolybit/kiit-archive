import { Icon } from "./Icon";

/** Shared "still being prepared" state for the not-yet-built sections. */
export function Placeholder({
  title,
  caption,
}: {
  title: string;
  caption: string;
}) {
  return (
    <>
      <h1>{title}</h1>
      <p className="caption">{caption}</p>
      <div className="panel">
        <div className="empty-state">
          <Icon name="construction" className="big" />
          <p>This section is being prepared.</p>
        </div>
      </div>
    </>
  );
}
