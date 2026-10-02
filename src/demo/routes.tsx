import { AccountRecoveryPage } from '@/features/employee-security/account-recovery-page';
import { AiAllocationPage } from '@/features/ai-management/ai-allocation-page';
import { AiPoolDetailPage } from '@/features/ai-management/ai-pool-detail-page';
import { AiPayoutPage } from '@/features/ai-management/ai-payout-page';
import { AiProjectsPage } from '@/features/ai-management/ai-projects-page';
import { AiReportPage } from '@/features/ai-management/ai-report-page';
import { EmployeesPage } from '@/features/employee-security/employees-page';
import { LedgerPage } from '@/features/ledger-management/ledger-page';
import { AdminLoginPage } from '@/features/employee-security/login-page';
import { CatalogPage } from '@/features/operations/catalog-page';
import { DrawReviewPage } from '@/features/operations/draw-review-page';
import { IssuesPage } from '@/features/operations/issues-page';
import { OmissionHealthPage } from '@/features/operations/omission-health-page';
import { RobotExecutionsPage } from '@/features/robots/robot-executions-page';
import { RobotDetailPage } from '@/features/robots/robot-detail-page';
import { RobotListPage } from '@/features/robots/robot-list-page';
import { MemberDetailPage } from '@/features/member-management/member-detail-page';
import { VersionChangesPage } from '@/features/change-notes/change-notes';
import { MembersPage } from '@/features/member-management/members-page';
import { ReferralConfigurationPage } from '@/features/member-management/configuration-pages';
import { MemberReportsPage } from '@/features/member-management/member-reports-page';
import { VipConfigurationPage } from '@/features/member-management/configuration-pages';
import { OrderDetailPage } from '@/features/order-management/order-detail-page';
import { OrdersPage } from '@/features/order-management/orders-page';
import { OverviewPage } from '@/features/operations/overview-page';
import { StationManagementPage } from '@/features/station-management/station-management-page';
export const routes=[{ path:"/account-recovery", component:AccountRecoveryPage, params:[] },
{ path:"/ai-pools", component:AiProjectsPage, params:[] },
{ path:"/ai-pools/reports", component:AiReportPage, params:[] },
{ path:"/employees", component:EmployeesPage, params:[] },
{ path:"/ledger", component:LedgerPage, params:[] },
{ path:"/login", component:AdminLoginPage, params:[] },
{ path:"/lottery/catalog", component:CatalogPage, params:[] },
{ path:"/lottery/draws", component:DrawReviewPage, params:[] },
{ path:"/lottery/issues", component:IssuesPage, params:[] },
{ path:"/lottery/omissions", component:OmissionHealthPage, params:[] },
{ path:"/masters", component:RobotListPage, params:[] },
{ path:"/version-changes", component:VersionChangesPage, params:[] },
{ path:"/members", component:MembersPage, params:[] },
{ path:"/members/referrals", component:ReferralConfigurationPage, params:[] },
{ path:"/members/reports", component:MemberReportsPage, params:[] },
{ path:"/members/vip", component:VipConfigurationPage, params:[] },
{ path:"/orders", component:OrdersPage, params:[] },
{ path:"/", component:OverviewPage, params:[] },
{ path:"/stations", component:StationManagementPage, params:[] },
{ path:"/ai-pools/[poolIssueId]/allocation", component:AiAllocationPage, params:["poolIssueId"] },
{ path:"/ai-pools/[poolIssueId]", component:AiPoolDetailPage, params:["poolIssueId"] },
{ path:"/ai-pools/[poolIssueId]/payout", component:AiPayoutPage, params:["poolIssueId"] },
{ path:"/masters/[robotId]/executions", component:RobotExecutionsPage, params:["robotId"] },
{ path:"/masters/[robotId]", component:RobotDetailPage, params:["robotId"] },
{ path:"/members/[memberId]", component:MemberDetailPage, params:["memberId"] },
{ path:"/orders/[orderId]", component:OrderDetailPage, params:["orderId"] }];
