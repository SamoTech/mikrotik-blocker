# MikroTik Firewall Blocker - IPv6 example
# Review RouterOS release and existing IPv6 rule ordering before deployment.

/ipv6 firewall address-list
add list=blocked_service_v6 address=2001:db8::10 comment="example.com"

/ipv6 firewall filter
add chain=forward dst-address-list=blocked_service_v6 action=drop comment="Block example.com IPv6"
