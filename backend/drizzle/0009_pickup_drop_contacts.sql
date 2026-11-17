-- AJ-05: pickup and drop contact name + phone, shared with the transporter after acceptance.
-- Both sides are optional (the journey doc marks them "No" for required).
ALTER TABLE "loads"
    ADD COLUMN "pickup_contact_name" varchar(100),
    ADD COLUMN "pickup_contact_phone" varchar(15),
    ADD COLUMN "drop_contact_name" varchar(100),
    ADD COLUMN "drop_contact_phone" varchar(15);
