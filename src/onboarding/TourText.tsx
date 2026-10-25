/** Emphasize actual dataset IDs and pool prefixes without rendering HTML. */
export function TourText({ text }: { text: string }) {
  return text.split(/(\bGID_[A-Za-z0-9]+\b)/g).map((part, index) =>
    /^GID_[A-Za-z0-9]+$/.test(part) ? (
      <mark className="tour-reference" key={index}>
        {part}
      </mark>
    ) : (
      part
    ),
  );
}
