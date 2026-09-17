# MikroTik Blocker recipe: DNS hardening
# Template only — replace resolver scope with the policy actually approved for your network.
# Review and backup before applying.

/ip firewall address-list
add list=blocked_public_dns address=1.1.1.1 comment="MikroTik Blocker:dns-hardening Cloudflare DNS"
add list=blocked_public_dns address=8.8.8.8 comment="MikroTik Blocker:dns-hardening Google DNS"
add list=blocked_public_dns address=9.9.9.9 comment="MikroTik Blocker:dns-hardening Quad9 DNS"
add list=blocked_public_dns address=208.67.222.222 comment="MikroTik Blocker:dns-hardening OpenDNS"

/ip firewall filter
add chain=forward protocol=udp dst-port=53 dst-address-list=blocked_public_dns action=drop comment="MikroTik Blocker:dns-hardening"
add chain=forward protocol=tcp dst-port=53 dst-address-list=blocked_public_dns action=drop comment="MikroTik Blocker:dns-hardening"

# Rollback: remove entries/rules by comment after review.
