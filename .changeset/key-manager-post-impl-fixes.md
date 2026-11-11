---
"@cobaltcore-dev/aurora": patch
---

- Make `private_key_passphrase` optional when creating an RSA container (Barbican requires only `private_key` and `public_key`)
- Show a warning in the Delete Order modal when the order is still in PENDING state to prevent orphaned Barbican resources
- Make secret-ref rows in the Container detail view clickable, navigating directly to the secret detail page
- Hide the Mode field in the Create Order modal for asymmetric key type, where it has no effect
- Add a Download button to the Secret payload section, writing the payload as a `.txt`, `.pem`, or `.bin` file based on its content type
