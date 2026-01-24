// FILE: nativewind-env.d.ts
/// <reference types="nativewind/types" />

declare module "*.css" {
  const content: any;
  export default content;
}
