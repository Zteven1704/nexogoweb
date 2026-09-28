export type IconName =
  | "users"
  | "user"
  | "folder"
  | "file"
  | "badge"
  | "lock"
  | "building"
  | "shield";

type IconProps = {
  name: IconName;
  className?: string;
};

export function Icon({ name, className = "size-5" }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {iconPaths[name]}
    </svg>
  );
}

const iconPaths: Record<IconName, React.ReactNode> = {
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19.5c.8-3 3-4.5 5.5-4.5s4.7 1.5 5.5 4.5" />
      <circle cx="17" cy="9" r="2.25" />
      <path d="M16.2 14.2c2.2.3 3.8 1.7 4.3 4.3" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M5 19.5c1.2-3.2 3.4-4.8 7-4.8s5.8 1.6 7 4.8" />
    </>
  ),
  folder: (
    <>
      <path d="M3.5 7.5h5.2l1.8 2H20.5V19a1.5 1.5 0 0 1-1.5 1.5h-14A1.5 1.5 0 0 1 3.5 19Z" />
    </>
  ),
  file: (
    <>
      <path d="M7 3.5h6.2L19 9.2V20a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 7 20Z" />
      <path d="M13 3.5V9h5.8" />
    </>
  ),
  badge: (
    <>
      <circle cx="12" cy="8.5" r="3.25" />
      <path d="M8.8 11.2 7.2 19.5 12 17.2l4.8 2.3-1.6-8.3" />
    </>
  ),
  lock: (
    <>
      <rect x="5.5" y="10.5" width="13" height="9" rx="2" />
      <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" />
    </>
  ),
  building: (
    <>
      <path d="M4.5 20.5V6.5h9v14" />
      <path d="M13.5 20.5V10h6v10.5" />
      <path d="M3.5 20.5h17" />
      <path d="M7 9.5h2M7 13h2M7 16.5h2M16 13.5h2M16 16.5h2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19 6.2v5.6c0 4.3-2.9 6.8-7 8.2-4.1-1.4-7-3.9-7-8.2V6.2Z" />
    </>
  ),
};
