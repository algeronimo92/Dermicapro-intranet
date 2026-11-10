INSERT INTO "roles" ("id", "name", "display_name", "description")
VALUES (
  '8d7f3afc-8d90-4f04-bbce-d6043f521935',
  'accountant',
  'Contador',
  'Consulta facturas y descarga sus adjuntos'
)
ON CONFLICT ("name") DO UPDATE
SET "display_name" = EXCLUDED."display_name",
    "description" = EXCLUDED."description";
