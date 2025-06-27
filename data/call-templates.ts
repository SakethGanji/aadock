import type { CallTemplate } from "../types/auth"

export const CALL_TEMPLATES: CallTemplate[] = [
  {
    id: "start_call_eclipse",
    name: "START_CALL - Eclipse",
    description: "Start call event for Eclipse LOB",
    params: {
      eventName: "START_CALL",
      callDetailsAO: {
        nivrNumber: "0000000000",
        transferFlag: "N",
        Ucid: `${Date.now()}00000000000`,
        stopRecording: "N",
        convertedUcid: `ECLIPSE${Date.now()}`
      },
      agentDetailsA0: {
        soeId: "SOE12345",
        roleId: "ROLE_ECLIPSE",
        activityMode: "Available",
        siteCode: "ECL",
        teamCode: "1001",
        supervisorOverride: "N",
        transferringAgent: "",
        searchRoleList: ["ROLE_ECLIPSE_AGENT", "ROLE_ECLIPSE_SUPPORT"],
        ctcRole: "Y",
        pilotRole: "N",
        permissionSets: ["PERM_READ", "PERM_WRITE", "PERM_ECLIPSE"]
      },
      customerDetailsAO: {
        accountHoLderRoLe: "PRIMARY",
        accountHoLderRoLeCode: "01",
        accountNumbep: "",
        customerName: "",
        ccid: "",
        Line0fBusiness: "ECLIPSE",
        productType: "Standard"
      }
    },
  },
  {
    id: "start_call_olympus",
    name: "START_CALL - Olympus",
    description: "Start call event for Olympus LOB",
    params: {
      eventName: "START_CALL",
      callDetailsAO: {
        nivrNumber: "0000000000",
        transferFlag: "N",
        Ucid: `${Date.now()}00000000000`,
        stopRecording: "N",
        convertedUcid: `OLYMPUS${Date.now()}`
      },
      agentDetailsA0: {
        soeId: "SOE12345",
        roleId: "ROLE_OLYMPUS",
        activityMode: "Available",
        siteCode: "OLY",
        teamCode: "2001",
        supervisorOverride: "N",
        transferringAgent: "",
        searchRoleList: ["ROLE_OLYMPUS_AGENT", "ROLE_OLYMPUS_SALES"],
        ctcRole: "Y",
        pilotRole: "Y",
        permissionSets: ["PERM_READ", "PERM_WRITE", "PERM_OLYMPUS", "PERM_SALES"]
      },
      customerDetailsAO: {
        accountHoLderRoLe: "PRIMARY",
        accountHoLderRoLeCode: "01",
        accountNumbep: "",
        customerName: "",
        ccid: "",
        Line0fBusiness: "OLYMPUS",
        productType: "Premium"
      }
    },
  },
  {
    id: "start_call_sawgrass",
    name: "START_CALL - Sawgrass",
    description: "Start call event for Sawgrass LOB",
    params: {
      eventName: "START_CALL",
      callDetailsAO: {
        nivrNumber: "0000000000",
        transferFlag: "N",
        Ucid: `${Date.now()}00000000000`,
        stopRecording: "N",
        convertedUcid: `SAWGRASS${Date.now()}`
      },
      agentDetailsA0: {
        soeId: "SOE12345",
        roleId: "ROLE_SAWGRASS",
        activityMode: "Available",
        siteCode: "SAW",
        teamCode: "3001",
        supervisorOverride: "N",
        transferringAgent: "",
        searchRoleList: ["ROLE_SAWGRASS_AGENT", "ROLE_SAWGRASS_PREMIUM"],
        ctcRole: "Y",
        pilotRole: "Y",
        permissionSets: ["PERM_READ", "PERM_WRITE", "PERM_SAWGRASS", "PERM_VIP"]
      },
      customerDetailsAO: {
        accountHoLderRoLe: "PRIMARY",
        accountHoLderRoLeCode: "01",
        accountNumbep: "",
        customerName: "",
        ccid: "",
        Line0fBusiness: "SAWGRASS",
        productType: "VIP"
      }
    },
  },
]