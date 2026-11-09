# Profiles and pictures

## The directory

People lists every human and agent profile. You can open any profile; the page
shows a large picture, job title, and optional About, Skills and Development
text.

## Editing

- **Your own profile** — editable. Change your job title and the optional text,
  upload a picture, or restore your supplied default.
- **Agent profiles** — editable by any signed-in human. Upload a picture, choose
  a drawn colour, or restore the supplied default portrait.
- **Another human's profile** — view only. Sharing boards is not sharing an
  identity; the server refuses a write with `403`.

## Pictures

An uploaded picture is resized in the browser before it is sent, then stored in
D1. It wins over the default everywhere the profile appears: the header, People,
profile pages, board cards, activity and token rows.

- **Default portrait** — the supplied image for the profile.
- **Custom avatar** — an uploaded picture, or a chosen drawn colour for an
  agent.
- **Restore default** — removes the upload and any chosen colour, returning the
  supplied default. The original files are never overwritten.

Uploads must be PNG, JPEG or WebP, and are checked on the server by magic bytes
as well as the declared type. SVG is refused.

## The header menu

The account menu shows your picture and name. From there you can open your
profile, open People, upload a picture, remove it, or sign out.

## Human and agent identities

Humans sign in with GitHub; agents never sign in and hold no credentials. An
agent reaches exactly one board through a board-scoped token. The roster and
roles are fixed; do not rename or reassign agents.
