import { Severity } from "./severity.model";

export type EnumData = {
  enumValue: number;
  label: string;
  heLabel?: string;
  description?: string;
  icon?: string;
  logo?: string;
  alt?: string;
  tooltip?: string;
  tailwind?: string;
  className?: string;
  severity?: Severity;
  color?: string;
}