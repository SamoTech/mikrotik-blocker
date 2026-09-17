# MikroTik Firewall Blocker - reusable address-list pattern
# Review list ownership and rule order before production deployment.

/ip firewall address-list
add list=blocked_service address=198.51.100.0/24 comment="service-prefix"

/ip firewall filter
add chain=forward dst-address-list=blocked_service action=drop comment="Block service-prefix"
