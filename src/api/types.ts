export type UserRole = 'Admin' | 'Manager' | 'Member' | 'Viewer'

export interface Customer {
  id: string
  name: string
  email: string
  createdAt: string
  updatedAt?: string
}

export interface UserDto {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  customerId: string
  createdAt: string
  apiCallCount: number
  apiCallDailyLimit: number | null
  ownerManagerId: string | null
  emailConfirmed: boolean
}

export type LegacySystemType = 'OpenEdgeSoap' | 'GenericSoap' | 'AsmxDotNet' | 'OracleSoap'
export type LegacyAuthType   = 'Basic' | 'Header' | 'OAuth2'
export type AccessEffect      = 'Allow' | 'Deny'

export interface LegacyAuthConfig {
  id: string
  authType: LegacyAuthType
  username?: string
  headerName?: string
  headerValue?: string
  tokenUrl?: string
  clientId?: string
}

export interface LegacySource {
  id: string
  systemType: LegacySystemType
  systemUrl: string
  swaggerUrl?: string
  customerId: string
  ownerManagerId?: string
  ownerManagerEmail?: string
  createdAt: string
  updatedAt?: string
  authConfig?: LegacyAuthConfig
  isSoapAllowed: boolean
}

export interface AccessRule {
  id: string
  legacySourceId?: string
  methodPattern: string
  effect: AccessEffect
}

export interface AccessPlanSummary {
  id: string
  name: string
  description?: string
  isActive: boolean
  customerId: string
  createdAt: string
  ruleCount: number
}

export interface AccessPlan extends AccessPlanSummary {
  updatedAt?: string
  rules: AccessRule[]
}

export interface WsdlField {
  name: string
  type: string
  required: boolean
}

export interface WsdlOperation {
  name: string
  fields: WsdlField[]
}
