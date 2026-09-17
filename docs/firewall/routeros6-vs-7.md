# RouterOS 6.x vs 7.x

Generated firewall material must declare its target RouterOS generation.

## General rule

Do not copy a RouterOS 6.x example into a RouterOS 7.x production router, or vice versa, without checking the relevant command path, object behavior, and syntax for the target release.

## Project policy

Every generated or documented example should make these assumptions explicit:

```text
RouterOS target: 6.x / 7.x / both
IPv4: yes/no
IPv6: yes/no
Layer7: yes/no
Dependencies: none / external data source
```

## Validation

The project's validator is intended to catch obvious script problems, but a generated script should still be tested on the target RouterOS version before broad deployment.

## Documentation discipline

When a RouterOS feature differs by generation, document both variants rather than silently presenting one syntax as universal. Where no meaningful difference exists, say so explicitly.
