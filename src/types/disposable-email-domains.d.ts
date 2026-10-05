// The package ships plain JSON lists without types.
declare module "disposable-email-domains" {
  const domains: string[];
  export default domains;
}

declare module "disposable-email-domains/wildcard.json" {
  const domains: string[];
  export default domains;
}
