export interface RulePreset {
  value: string
  label: string
  protocol: string | null
  portRangeMin: number | null
  portRangeMax: number | null
}

export const RULE_PRESETS: RulePreset[] = [
  // Empty default option - label rendered in UI with translation
  {
    value: "",
    label: "", // Rendered in RuleTypeSection with t()
    protocol: null,
    portRangeMin: null,
    portRangeMax: null,
  },
  // Custom rules (appears first)
  {
    value: "custom-tcp",
    label: "Custom TCP Rule",
    protocol: "tcp",
    portRangeMin: null,
    portRangeMax: null,
  },
  {
    value: "custom-udp",
    label: "Custom UDP Rule",
    protocol: "udp",
    portRangeMin: null,
    portRangeMax: null,
  },
  {
    value: "custom-icmp",
    label: "Custom ICMP Rule",
    protocol: "icmp",
    portRangeMin: null,
    portRangeMax: null,
  },
  {
    value: "all-tcp",
    label: "All TCP",
    protocol: "tcp",
    portRangeMin: 1,
    portRangeMax: 65535,
  },
  {
    value: "all-udp",
    label: "All UDP",
    protocol: "udp",
    portRangeMin: 1,
    portRangeMax: 65535,
  },
  {
    value: "all-icmp",
    label: "All ICMP",
    protocol: "icmp",
    portRangeMin: null,
    portRangeMax: null,
  },
  {
    value: "other-protocol",
    label: "Other Protocol",
    protocol: null,
    portRangeMin: null,
    portRangeMax: null,
  },

  // Common protocols
  {
    value: "dns",
    label: "DNS",
    protocol: "tcp",
    portRangeMin: 53,
    portRangeMax: 53,
  },
  {
    value: "http",
    label: "HTTP",
    protocol: "tcp",
    portRangeMin: 80,
    portRangeMax: 80,
  },
  {
    value: "https",
    label: "HTTPS",
    protocol: "tcp",
    portRangeMin: 443,
    portRangeMax: 443,
  },
  {
    value: "imap",
    label: "IMAP",
    protocol: "tcp",
    portRangeMin: 143,
    portRangeMax: 143,
  },
  {
    value: "imaps",
    label: "IMAPS",
    protocol: "tcp",
    portRangeMin: 993,
    portRangeMax: 993,
  },
  {
    value: "ldap",
    label: "LDAP",
    protocol: "tcp",
    portRangeMin: 389,
    portRangeMax: 389,
  },
  {
    value: "ms-sql",
    label: "MS SQL",
    protocol: "tcp",
    portRangeMin: 1433,
    portRangeMax: 1433,
  },
  {
    value: "mysql",
    label: "MySQL",
    protocol: "tcp",
    portRangeMin: 3306,
    portRangeMax: 3306,
  },
  {
    value: "pop3",
    label: "POP3",
    protocol: "tcp",
    portRangeMin: 110,
    portRangeMax: 110,
  },
  {
    value: "pop3s",
    label: "POP3S",
    protocol: "tcp",
    portRangeMin: 995,
    portRangeMax: 995,
  },
  {
    value: "rdp",
    label: "RDP",
    protocol: "tcp",
    portRangeMin: 3389,
    portRangeMax: 3389,
  },
  {
    value: "ssh",
    label: "SSH",
    protocol: "tcp",
    portRangeMin: 22,
    portRangeMax: 22,
  },
  {
    value: "smtp",
    label: "SMTP",
    protocol: "tcp",
    portRangeMin: 25,
    portRangeMax: 25,
  },
  {
    value: "smtps",
    label: "SMTPS",
    protocol: "tcp",
    portRangeMin: 465,
    portRangeMax: 465,
  },
]
