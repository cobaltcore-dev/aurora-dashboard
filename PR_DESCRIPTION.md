# Summary

Closes #1334

This PR includes UI improvements and fixes for the flavor management interface, with proper OpenStack Nova API microversion handling for the description field.

## Changes

### 1. Remove padding from empty metadata status

When editing flavor metadata, the "No Metadata Properties Found" empty state now has zero margin (`m-0`) for better visual alignment within the modal.

### 2. Fix controlled/uncontrolled input warning

Fixed React warning for the `rxtx_factor` field by removing conflicting `defaultValue` prop while keeping `value` prop.

### 3. Add Nova API microversion detection and support for flavor description

The `description` field is now fully functional with automatic OpenStack version detection:

**Fixed:**

- Added `description` field to `CreateFlavorInput` type and Zod validation schema
- Implemented automatic Nova API microversion detection via version discovery endpoint
- Dynamically send `OpenStack-API-Version` header only when the deployment supports it (≥ 2.55)
- Apply microversion headers to all flavor operations (create, read, list) to ensure description field is returned
- Ensure backward compatibility: older OpenStack versions (< 2.55) work normally without the description field

**How it works:**

- The backend queries the Nova API version discovery endpoint (`/compute/` or `/compute/v2.1/`)
- Parses the response to detect the maximum supported microversion
- Only sends `OpenStack-API-Version: compute X.XX` header when version ≥ 2.55 (description support)
- Conditionally shows/hides the description field in the UI based on detected version
- Gracefully handles both old and new OpenStack deployments

**Supported OpenStack versions:**

- ✅ **Ocata (2.55) and newer**: Full description support
- ✅ **Newton and older**: Works normally, description field hidden
- ✅ **Tested with Yoga (2.95)**: Working

## Testing

- All existing unit tests pass
- Tested flavor creation with description on OpenStack Yoga (microversion 2.95)
- Verified description field appears in flavor list and details views
- Verified backward compatibility handling for older versions

---

# Checklist

- [x] I have performed a self-review of my code.
- [x] I have commented my code, particularly in hard-to-understand areas.
- [x] I have added tests that prove my fix is effective or that my feature works.
- [x] New and existing unit tests pass locally with my changes.
- [ ] I have made corresponding changes to the documentation (if applicable).
- [x] My changes generate no new warnings or errors.
