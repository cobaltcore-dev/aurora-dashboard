# DevStack Version Reference

This document lists available DevStack versions you can use in your `.env` file.

## 🎯 Recommended Versions (Actively Maintained)

| Version | Release Name | Release Date | Status | Use Case |
|---------|-------------|--------------|--------|----------|
| `stable/2025.2` | Flamingo | Oct 2025 | Maintained | Latest features |
| `stable/2025.1` | Epoxy | Apr 2025 | Maintained | **Recommended** for stability |
| `stable/2024.2` | Dalmatian | Oct 2024 | Maintained | Proven stability |

## 📊 Recent Versions (Unmaintained but usable)

| Version | Release Name | Release Date | Status | Notes |
|---------|-------------|--------------|--------|-------|
| `stable/2024.1` | Caracal | Apr 2024 | Unmaintained | Still functional |
| `stable/2023.2` | Bobcat | Oct 2023 | EOL | May have issues |
| `stable/antelope` | Antelope (2023.1) | Mar 2023 | Unmaintained | Named release |

## 🏷️ Legacy Named Releases (Not Recommended)

| Version | Release Name | Release Date | Status |
|---------|-------------|--------------|--------|
| `stable/zed` | Zed | Oct 2022 | Unmaintained |
| `stable/yoga` | Yoga | Mar 2022 | Unmaintained |
| `stable/xena` | Xena | Oct 2021 | EOL |
| `stable/wallaby` | Wallaby | Apr 2021 | EOL |
| `stable/victoria` | Victoria | Oct 2020 | EOL |

## 🚀 Development Branch

| Version | Description | Recommended For |
|---------|-------------|-----------------|
| `master` | Development branch | Testing new features, not for production |

## 🔄 Version Naming Convention

OpenStack changed naming conventions:

- **Before 2023.2**: Named releases (Yoga, Zed, Antelope, etc.)
- **From 2023.2 onwards**: Date-based releases (YYYY.X format)

## 📝 How to Use

Set in your `.env` file:

```bash
# Recommended: Latest stable
DEVSTACK_VERSION=stable/2025.1

# Or: Most stable
DEVSTACK_VERSION=stable/2024.2

# Or: Bleeding edge (not recommended)
DEVSTACK_VERSION=master

# Or: Specific named release
DEVSTACK_VERSION=stable/antelope
```

## 🔍 Checking Available Branches

```bash
# List all stable branches
git ls-remote --heads https://github.com/openstack/devstack.git | grep stable

# List all tags (EOL markers)
git ls-remote --tags https://github.com/openstack/devstack.git | grep -E "(eol|eom)"
```

## 📚 References

- [OpenStack Releases](https://releases.openstack.org/)
- [DevStack Repository](https://github.com/openstack/devstack)
- [DevStack Active Branches](https://github.com/openstack/devstack/branches/active)
- [Release Naming](https://releases.openstack.org/reference/release_naming.html)

## ⚠️ Notes

- **EOL** (End of Life): No longer maintained, may have security issues
- **Unmaintained**: No active maintenance, but still accessible
- **Maintained**: Actively receiving updates and security patches
- Each release is maintained for approximately 18 months
- Security updates continue for 6-12 months after initial release
