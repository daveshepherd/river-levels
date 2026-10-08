/** A river level reading for one station. */
export interface Reading {
  /** When the reading was taken. */
  date: Date;
  /** River level in metres above stage datum (mASD). */
  depth: number;
}
