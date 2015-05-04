# Changelog

## Devel

- Authentication is refactored and email is used as the identify of user.
- Local authentication strategy is removed and Cantas will rely on third party
  authentication services.
- Make noreply email address and the email domain of invitation configurable
- Fix SPEC errors
- Add help script to add an user
- Refactor app.js
- #94 - Set unusable password in remote user and Kerberos strategy
- Use Username as the placeholder instead
- Refine flash message of Kerberos strategy
- New local user strategy
- Allow to specify default authentication strategry from settings
- #69 - Google Authentication redirects back to login page, cannot log in
- FIX: Oauth2 callback properties correction
- FIX cantas service init file

## 1.0.1 (2014-09-02)

+ support login with google auth2
+ add mycards panels to home page
+ support cards filter
+ upload file to card, support image cover on card face
