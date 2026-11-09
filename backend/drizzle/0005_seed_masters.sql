-- Master lists for Ad Hoc loads. Safe to re-run: existing rows are left alone.
-- Truck types: the list the client confirms (tickets/adhoc-load.md, Q9) can be edited here or by the platform admin later.
INSERT INTO "vehicle_types" ("code", "name", "body_type", "capacity_tons", "sort_order") VALUES
    ('open_17', '17 ft Open', 'open', 5, 10),
    ('open_19', '19 ft Open', 'open', 7, 20),
    ('open_20', '20 ft Open', 'open', 9, 30),
    ('open_22', '22 ft Open', 'open', 10, 40),
    ('open_24', '24 ft Open', 'open', 14, 50),
    ('closed_19', '19 ft Closed Container', 'closed', 7, 60),
    ('closed_22', '22 ft Closed Container', 'closed', 10, 70),
    ('closed_24', '24 ft Closed Container', 'closed', 14, 80),
    ('sxl_32', '32 ft SXL Container', 'closed', 9, 90),
    ('mxl_32', '32 ft MXL Container', 'closed', 18, 100),
    ('trailer_40_flat', '40 ft Flatbed Trailer', 'trailer', 25, 110),
    ('trailer_40_high', '40 ft High-bed Trailer', 'trailer', 30, 120),
    ('tanker', 'Tanker', 'tanker', 20, 130),
    ('reefer_20', '20 ft Reefer', 'reefer', 7, 140),
    ('reefer_32', '32 ft Reefer', 'reefer', 15, 150),
    ('tipper_10w', '10-wheel Tipper', 'tipper', 16, 160),
    ('tipper_14w', '14-wheel Tipper', 'tipper', 25, 170),
    ('odc_lowbed', 'Low-bed Trailer (ODC)', 'odc', 40, 180)
ON CONFLICT ("code") DO NOTHING;
--> statement-breakpoint
INSERT INTO "commodities" ("name", "sort_order") VALUES
    ('Steel coils', 10), ('Steel plates and sheets', 20), ('TMT bars', 30), ('Pipes', 40),
    ('Cement', 50), ('Fly ash', 60), ('Coal', 70), ('Iron ore', 80), ('Aggregates and sand', 90), ('Bricks', 100),
    ('Chemicals (non-hazardous)', 110), ('Chemicals (hazardous)', 120), ('Petroleum products', 130), ('Edible oil', 140),
    ('Food grains', 150), ('Rice', 160), ('Sugar', 170), ('Fertilizer', 180),
    ('FMCG goods', 190), ('Textiles', 200), ('Pharmaceuticals', 210), ('Electronics', 220),
    ('Auto parts', 230), ('Machinery', 240), ('Paper', 250), ('Plastic granules', 260),
    ('Timber', 270), ('Glass', 280), ('Tiles', 290), ('Furniture', 300), ('Other', 999)
ON CONFLICT ("name") DO NOTHING;
--> statement-breakpoint
INSERT INTO "pin_codes" ("pin_code", "city", "state") VALUES
    ('110001', 'New Delhi', 'Delhi'), ('122001', 'Gurugram', 'Haryana'), ('121001', 'Faridabad', 'Haryana'),
    ('201301', 'Noida', 'Uttar Pradesh'), ('201001', 'Ghaziabad', 'Uttar Pradesh'), ('226001', 'Lucknow', 'Uttar Pradesh'),
    ('208001', 'Kanpur', 'Uttar Pradesh'), ('221001', 'Varanasi', 'Uttar Pradesh'), ('282001', 'Agra', 'Uttar Pradesh'),
    ('250001', 'Meerut', 'Uttar Pradesh'), ('160001', 'Chandigarh', 'Chandigarh'), ('141001', 'Ludhiana', 'Punjab'),
    ('143001', 'Amritsar', 'Punjab'), ('248001', 'Dehradun', 'Uttarakhand'), ('302001', 'Jaipur', 'Rajasthan'),
    ('342001', 'Jodhpur', 'Rajasthan'), ('313001', 'Udaipur', 'Rajasthan'), ('324001', 'Kota', 'Rajasthan'),
    ('400001', 'Mumbai', 'Maharashtra'), ('411001', 'Pune', 'Maharashtra'), ('440001', 'Nagpur', 'Maharashtra'),
    ('422001', 'Nashik', 'Maharashtra'), ('431001', 'Chhatrapati Sambhajinagar', 'Maharashtra'), ('416001', 'Kolhapur', 'Maharashtra'),
    ('380001', 'Ahmedabad', 'Gujarat'), ('395001', 'Surat', 'Gujarat'), ('390001', 'Vadodara', 'Gujarat'),
    ('360001', 'Rajkot', 'Gujarat'), ('361001', 'Jamnagar', 'Gujarat'), ('370210', 'Kandla', 'Gujarat'), ('370421', 'Mundra', 'Gujarat'),
    ('403001', 'Panaji', 'Goa'), ('452001', 'Indore', 'Madhya Pradesh'), ('462001', 'Bhopal', 'Madhya Pradesh'),
    ('474001', 'Gwalior', 'Madhya Pradesh'), ('482001', 'Jabalpur', 'Madhya Pradesh'), ('492001', 'Raipur', 'Chhattisgarh'),
    ('490001', 'Bhilai', 'Chhattisgarh'), ('495001', 'Bilaspur', 'Chhattisgarh'), ('700001', 'Kolkata', 'West Bengal'),
    ('711101', 'Howrah', 'West Bengal'), ('734001', 'Siliguri', 'West Bengal'), ('713201', 'Durgapur', 'West Bengal'),
    ('713301', 'Asansol', 'West Bengal'), ('721602', 'Haldia', 'West Bengal'), ('800001', 'Patna', 'Bihar'),
    ('834001', 'Ranchi', 'Jharkhand'), ('831001', 'Jamshedpur', 'Jharkhand'), ('826001', 'Dhanbad', 'Jharkhand'),
    ('751001', 'Bhubaneswar', 'Odisha'), ('753001', 'Cuttack', 'Odisha'), ('769001', 'Rourkela', 'Odisha'), ('754142', 'Paradip', 'Odisha'),
    ('781001', 'Guwahati', 'Assam'), ('786125', 'Tinsukia', 'Assam'), ('793001', 'Shillong', 'Meghalaya'),
    ('799001', 'Agartala', 'Tripura'), ('795001', 'Imphal', 'Manipur'), ('797112', 'Dimapur', 'Nagaland'),
    ('500001', 'Hyderabad', 'Telangana'), ('530001', 'Visakhapatnam', 'Andhra Pradesh'), ('520001', 'Vijayawada', 'Andhra Pradesh'),
    ('560001', 'Bengaluru', 'Karnataka'), ('575001', 'Mangaluru', 'Karnataka'), ('580020', 'Hubballi', 'Karnataka'), ('570001', 'Mysuru', 'Karnataka'),
    ('600001', 'Chennai', 'Tamil Nadu'), ('641001', 'Coimbatore', 'Tamil Nadu'), ('625001', 'Madurai', 'Tamil Nadu'),
    ('682001', 'Kochi', 'Kerala'), ('695001', 'Thiruvananthapuram', 'Kerala')
ON CONFLICT ("pin_code") DO NOTHING;
