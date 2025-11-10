/**
 * Proof structure matching Solidity Proof struct
 */
export interface Proof {
  /** r component of the signature */
  r: string;
  /** s component of the signature */
  s: string;
  /** v component of the signature */
  v: number;
}
