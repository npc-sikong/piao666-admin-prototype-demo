// Fixed identities from the local operational master's catalog, verified 2026-09-29.
const masterAvatarIds = new Set<string>([
  "fd067211-131c-a0ac-d696-d8244b3e9f1b", // 七乐彩降权过滤大师
  "fa4b4657-a786-b552-69ee-1cbd913180f7", // 七乐彩均衡大师
  "f95e981c-57aa-c7e7-27c4-cb674e18455d", // 大乐透趋势大师
  "f9448353-1ac0-5160-cdd4-0eb866c6e668", // 福彩3D降权过滤大师
  "f01da2d9-cec8-1a62-14ab-4bc5fa0677b5", // 排列三冷热混合大师
  "eeee31fb-bf3f-ebd6-7104-80f7aeb3fc31", // 双色球冷热混合大师
  "ed756d4a-258e-96b5-5aa2-6f9eb600dc3f", // 双色球均衡大师
  "e8a3b690-34c2-29d8-c14b-2806df1c33af", // 排列三趋势大师
  "e2f0fc54-72e7-93b8-de5c-725a3c37e8c0", // 排列三多模型组合大师
  "dbdc1527-3217-c3be-a5c1-047ff31c39e6", // 排列三降权过滤大师
  "cdf42bf9-8bf2-6dc3-34b7-ffa35dc0fe11", // 福彩3D探索大师
  "c9e4ad3d-e696-c0cd-d5f0-fcfd82813bda", // 快乐8探索大师
  "c9892f8d-63e1-3005-dc2b-f013b92d0acc", // 快乐8多模型组合大师
  "c511a4ce-229a-f1aa-d0c8-7f8259393642", // 排列五探索大师
  "bdd2b658-38b9-62f5-2bdc-f8ad9b76e165", // 七乐彩趋势大师
  "bc7ca6ca-8f8c-4047-7517-ad95e194db31", // 福彩3D均衡大师
  "b6474b49-7960-6884-1d17-06621c8b1e56", // 福彩3D多模型组合大师
  "b5625fea-11bc-6631-73fe-def5e14f06bb", // 双色球多模型组合大师
  "b14257f6-c019-bdc8-c07b-85851c5814ad", // 7星彩均衡大师
  "ad5f30b7-2e39-8f16-f0cf-15488d5a2539", // 七乐彩冷热混合大师
  "a3a5e8cf-dbf8-874b-f748-672d09714412", // 排列五降权过滤大师
  "a26042f9-2cd8-ccb8-cadf-a6dda6c87097", // 大乐透降权过滤大师
  "9d572651-fa4c-0190-96c8-86f31e900241", // 7星彩探索大师
  "9cfc03ab-89ca-1529-3aa1-71f1ccab9485", // 快乐8均衡大师
  "8ed5aa16-1024-6e35-3b49-c983a9304f7e", // 福彩3D趋势大师
  "88f17a06-f30d-bb19-2972-c8666599cbcd", // 7星彩趋势大师
  "87055581-50bc-3ded-79cc-eaa4890a3f18", // 七乐彩探索大师
  "823fd625-9f18-446b-4f5f-c500b2629f0c", // 大乐透冷热混合大师
  "7d0b2c1d-7028-c205-7d34-7e8055831b39", // 排列五趋势大师
  "79ffea34-dc26-2a9c-a113-0e5ecaf3ae89", // 排列三探索大师
  "708c1e0f-3397-dd1e-31ad-fd9b2d2c7f64", // 福彩3D冷热混合大师
  "6371e0aa-25f9-3fb5-50b7-8d451efd82c0", // 双色球降权过滤大师
  "6271ae6c-c884-47c2-e863-c2dfd7dda63f", // 大乐透探索大师
  "5f7e314d-131d-b833-f2e4-5d7b6420edd9", // 快乐8冷热混合大师
  "57a01e1d-7f64-6c07-bda7-44d5a85fc8eb", // 7星彩降权过滤大师
  "4c527068-b623-ff7d-fab4-f957df962cfc", // 排列五冷热混合大师
  "4a84bef1-fbaa-a495-9be3-c5234595fc6d", // 双色球探索大师
  "481d2c9a-b380-bc04-bbc5-ec562c2f3f5f", // 快乐8降权过滤大师
  "4624013b-0d33-fcb5-cb32-3122d3589180", // 快乐8趋势大师
  "3e61954a-8062-2810-0364-3e50bb0c3449", // 大乐透均衡大师
  "3aa0cfb9-6306-359d-7155-dc05f0f004a9", // 排列三均衡大师
  "2932cc95-c26a-3cbf-ac4d-a73aa0e439b2", // 7星彩多模型组合大师
  "272a7a94-14cd-4d9d-c47a-e656da58b40d", // 七乐彩多模型组合大师
  "1d31c769-5a34-0bd1-892d-6f4f7b58bd17", // 双色球趋势大师
  "1596c943-3d45-c285-3670-c226e77aa78c", // 大乐透多模型组合大师
  "146dd3bd-6be8-633e-421c-b3844d7e2410", // 排列五均衡大师
  "11e4d4a2-13b3-a48d-5a63-7bad72fa0eab", // 7星彩冷热混合大师
  "0fc4415d-fcf5-8074-5683-2436a0a4edb4", // 排列五多模型组合大师
]);

export function masterAvatarPath(masterId: string): string | null {
  return masterAvatarIds.has(masterId)
    ? `/images/masters/${masterId}.webp`
    : null;
}
