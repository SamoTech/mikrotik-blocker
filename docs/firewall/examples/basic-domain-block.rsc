# MikroTik Firewall Blocker - basic domain example
# RouterOS target: review on target release before production
# Documentation address space is used intentionally.

/ip firewall address-list
add list=blocked_example address=203.0.113.10 comment="example.com"

/ip firewall filter
add chain=forward dst-address-list=blocked_example action=drop comment="Block example.com"
