UPDATE public.profiles SET full_name = CASE email
  WHEN 'oak1512001@gmail.com' THEN 'Omar Alaa'
  WHEN 'admin@gmail.com' THEN 'admin@gmail.com'
  WHEN 'admin1@gmail.com' THEN 'admin1@gmail.com'
  WHEN 'basntmohamd29@gmail.com' THEN 'Basnt Mohamed'
  WHEN 'uhslvylmf@gmail.com' THEN 'Davidlex'
  WHEN 'doniaaabdo4@gmail.com' THEN 'doniaaabdo4@gmail.com'
  WHEN 'pacrtoraceacademy@gmail.com' THEN 'Dr. Heba Othman'
  WHEN 'LearnArabicOnline@yahoo.com' THEN 'Dr.Ebrahim El-Shafiey'
  WHEN 'freelancing8021@gmail.com' THEN 'Drwaelshaker'
  WHEN 'emanelshaer2001@gmail.com' THEN 'emanelshaer'
  WHEN 'idolarab777@gmail.com' THEN 'ERP'
  WHEN 'esraasalama2211@gmail.com' THEN 'EsraaA.salama15'
  WHEN 'hasnaagamal24@gmail.com' THEN 'hasnaa'
  WHEN 'aboanasee1@gmail.com' THEN 'Ibrahim Talal Ali El-salamy'
  WHEN 'mansourelnagar545@gmail.com' THEN 'mansour'
  WHEN 'mohamedessam090999@gmail.com' THEN 'mohamed'
  WHEN 'omaralaa295@yahoo.com' THEN 'omar'
  WHEN 'awadaldahas@gmail.com' THEN 'roaa'
  WHEN 'aboadam1441@gmail.com' THEN 'Sameh moustafa'
  WHEN 'sartlyaljml@gmail.com' THEN 'Sara ali'
  WHEN 'Shymaahasan73@gmail.com' THEN 'shymaa'
  WHEN 'sidney_arredondo22@dbff.livethebest.shop' THEN 'sidneyarredondo'
  WHEN 'noreply@rawasikheg.com' THEN 'sys_bd0c5348'
  WHEN 'institute.tanzil@gail.com' THEN 'tanzil'
  WHEN 'tarekashraf13@gmail.com' THEN 'Tarek Elhanafy'
  ELSE full_name
END
WHERE lower(email) IN (
  'oak1512001@gmail.com','admin@gmail.com','admin1@gmail.com','basntmohamd29@gmail.com',
  'uhslvylmf@gmail.com','doniaaabdo4@gmail.com','pacrtoraceacademy@gmail.com',
  'learnarabiconline@yahoo.com','freelancing8021@gmail.com','emanelshaer2001@gmail.com',
  'idolarab777@gmail.com','esraasalama2211@gmail.com','hasnaagamal24@gmail.com',
  'aboanasee1@gmail.com','mansourelnagar545@gmail.com','mohamedessam090999@gmail.com',
  'omaralaa295@yahoo.com','awadaldahas@gmail.com','aboadam1441@gmail.com',
  'sartlyaljml@gmail.com','shymaahasan73@gmail.com','sidney_arredondo22@dbff.livethebest.shop',
  'noreply@rawasikheg.com','institute.tanzil@gail.com','tarekashraf13@gmail.com'
);