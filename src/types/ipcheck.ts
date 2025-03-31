export interface ipStatusApiResponse {
  ClientIP: string;
  Name: string;
  Organization: string;
  status: "ok" | "rdapError" | "offline";
}
