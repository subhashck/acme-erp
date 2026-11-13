import { pool } from "./client.ts";
import { db } from "./client.ts";
import { eq, sql } from "drizzle-orm";
import {
  programs,
  clinicalTopics,
  moduleUsers,
  moduleSettings,
  doctorProfiles,
  doctorEnrollments,
  questionBank,
  assessmentBlueprints,
  doctorPayments,
} from "./schema-doctor-cbt.ts";
import { user, account } from "./schema.ts";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "crypto";

export async function seedDoctorCbtDevData() {
  console.log("Seeding Doctor CBT demonstration and course data from attached curriculum...");

  // ---------------------------------------------------------------------------
  // 1. Program Master: Basic Course in Reproductive Medicine
  // ---------------------------------------------------------------------------
  const progData = [
    {
      code: "ACME-BRM-2601",
      title: "Basic Course in Reproductive Medicine",
      specialty: "Reproductive Medicine & Infertility (OBGY)",
      durationMonths: 6,
      totalCmeCredits: "15.00",
      description:
        "Comprehensive clinical skill upgradation program covering infertility workup, ovarian physiology, andrology, ovulation induction, IUI, embryology foundations, IVF/ICSI, and ART (Regulation) Act 2021.",
    },
  ];

  const programMap: Record<string, number> = {};
  for (const p of progData) {
    const [existing] = await db.select({ id: programs.id }).from(programs).where(eq(programs.code, p.code));
    if (existing) {
      await db
        .update(programs)
        .set({
          title: p.title,
          specialty: p.specialty,
          durationMonths: p.durationMonths,
          totalCmeCredits: p.totalCmeCredits,
          description: p.description,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(programs.id, existing.id));
      programMap[p.code] = existing.id;
    } else {
      const [inserted] = await db.insert(programs).values(p).returning({ id: programs.id });
      programMap[p.code] = inserted.id;
    }
  }

  const brmProgramId = programMap["ACME-BRM-2601"];

  // ---------------------------------------------------------------------------
  // 2. Clinical Curriculum Topics (10 Modules for Reproductive Medicine)
  // ---------------------------------------------------------------------------
  const topicsData = [
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-01",
      title: "Infertility Definition, Evaluation & Tubal Patency",
      description: "Definition of infertility, primary vs secondary, initial diagnostic workup, Pelvic Inflammatory Disease risk, and HSG.",
      cmeCredits: "1.50",
      displayOrder: 1,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-02",
      title: "Reproductive Physiology & Ovarian Endocrinology",
      description: "Pituitary-ovarian axis, LH surge, FSH folliculogenesis, ampullary fertilisation site, and luteal progesterone secretion.",
      cmeCredits: "1.50",
      displayOrder: 2,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-03",
      title: "Male Infertility, Andrology & Semen Analysis",
      description: "Testicular spermatogenesis, epididymal maturation, WHO semen analysis, asthenozoospermia, azoospermia, and DNA fragmentation index (DFI).",
      cmeCredits: "1.50",
      displayOrder: 3,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-04",
      title: "Female Etiologies: PCOS, Endometriosis & Tubal Factor",
      description: "Polycystic ovary syndrome, ovulatory dysfunction symptoms, endometriosis presentation, bilateral tubal obstruction, and thyroid function (TSH).",
      cmeCredits: "1.50",
      displayOrder: 4,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-05",
      title: "Ovarian Reserve Assessment & Ultrasound Biomarkers",
      description: "Antral follicle count (AFC), Anti-Müllerian hormone (AMH) biology & clinical utility, Transvaginal ultrasound (TVS) assessment.",
      cmeCredits: "1.50",
      displayOrder: 5,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-06",
      title: "Ovulation Induction & Follicular Monitoring Protocols",
      description: "Aims of ovulation induction, Letrozole in PCOS, serial follicular tracking, hCG maturation triggers, and OHSS prevention.",
      cmeCredits: "1.50",
      displayOrder: 6,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-07",
      title: "Intrauterine Insemination (IUI) & Sperm Processing",
      description: "Sperm washing/preparation, uterine placement mechanics, clinical eligibility (tubal patency), and multi-follicular multiple pregnancy risks.",
      cmeCredits: "1.50",
      displayOrder: 7,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-08",
      title: "Cryopreservation & Embryology Laboratory Foundations",
      description: "Gamete/embryo cryopreservation, ultra-rapid vitrification, syngamy, Day 5-6 blastocyst morphology, and embryology lab cleanroom standards.",
      cmeCredits: "1.50",
      displayOrder: 8,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-09",
      title: "Assisted Reproductive Technology (IVF & ICSI)",
      description: "In Vitro Fertilisation (IVF) culture system, controlled ovarian stimulation, ultrasound-guided embryo transfer, and Intracytoplasmic Sperm Injection (ICSI).",
      cmeCredits: "1.50",
      displayOrder: 9,
    },
    {
      programId: brmProgramId,
      code: "BCRM-TOPIC-10",
      title: "Ethics, Patient Counselling & ART (Regulation) Act, 2021",
      description: "Voluntary informed consent, reproductive record confidentiality, pre-ART psychological counselling, autonomy, and Assisted Reproductive Technology (Regulation) Act, 2021 statutory mandates.",
      cmeCredits: "1.50",
      displayOrder: 10,
    },
  ];

  const topicMap: Record<string, number> = {};
  for (const t of topicsData) {
    const [existing] = await db.select({ id: clinicalTopics.id }).from(clinicalTopics).where(eq(clinicalTopics.code, t.code));
    if (existing) {
      await db
        .update(clinicalTopics)
        .set({
          title: t.title,
          description: t.description,
          cmeCredits: t.cmeCredits,
          displayOrder: t.displayOrder,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(clinicalTopics.id, existing.id));
      topicMap[t.code] = existing.id;
    } else {
      const [inserted] = await db.insert(clinicalTopics).values(t).returning({ id: clinicalTopics.id });
      topicMap[t.code] = inserted.id;
    }
  }

  // ---------------------------------------------------------------------------
  // 3. 50 Multiple Choice Questions (Attached Curriculum & Answer Keys)
  // ---------------------------------------------------------------------------
  const rawQuestions = [
    {
      num: 1,
      topicCode: "BCRM-TOPIC-01",
      prompt: "What is the commonly accepted definition of infertility?",
      options: [
        "A. Failure to conceive after one month of unprotected intercourse",
        "B. Failure to achieve pregnancy after 12 months or more of regular unprotected intercourse",
        "C. Failure to conceive after five years of marriage",
        "D. Absence of menstruation for six months",
      ],
      key: 1, // B
      explanation: "Clinical guidelines define infertility as the failure to achieve clinical pregnancy after 12 months or more of regular, unprotected sexual intercourse in women under 35 years of age.",
    },
    {
      num: 2,
      topicCode: "BCRM-TOPIC-01",
      prompt: "Which of the following is an important initial step in infertility evaluation?",
      options: [
        "A. Immediate IVF treatment",
        "B. Hysterectomy",
        "C. Detailed medical, menstrual and reproductive history",
        "D. Embryo freezing",
      ],
      key: 2, // C
      explanation: "A thorough medical, coital, menstrual, surgical, and reproductive history of both partners is the essential first step before undertaking diagnostic investigations or therapeutic interventions.",
    },
    {
      num: 3,
      topicCode: "BCRM-TOPIC-01",
      prompt: "Which of the following best describes primary infertility?",
      options: [
        "A. A woman who has never achieved a pregnancy",
        "B. A woman who has had one or more previous pregnancies",
        "C. A woman with irregular menstruation only",
        "D. A woman who has undergone IVF",
      ],
      key: 0, // A
      explanation: "Primary infertility applies when a couple has never achieved a biological conception or clinical pregnancy after at least one year of unprotected intercourse.",
    },
    {
      num: 4,
      topicCode: "BCRM-TOPIC-01",
      prompt: "Which of the following is a risk factor for female infertility?",
      options: [
        "A. Normal ovulation",
        "B. Regular menstrual cycles",
        "C. Normal tubal patency",
        "D. Pelvic inflammatory disease",
      ],
      key: 3, // D
      explanation: "Pelvic Inflammatory Disease (PID), often secondary to Chlamydia trachomatis or Neisseria gonorrhoeae, leads to tubal scarring, fimbrial agglutination, and tubal factor infertility.",
    },
    {
      num: 5,
      topicCode: "BCRM-TOPIC-01",
      prompt: "Which investigation is commonly used to assess tubal patency?",
      options: [
        "A. Electrocardiogram",
        "B. Hysterosalpingography (HSG)",
        "C. Chest X-ray",
        "D. Complete blood count alone",
      ],
      key: 1, // B
      explanation: "Hysterosalpingography (HSG) uses fluoroscopic imaging with radiopaque iodinated contrast to delineate the uterine cavity and document free peritoneal spill indicating bilateral fallopian tube patency.",
    },
    {
      num: 6,
      topicCode: "BCRM-TOPIC-02",
      prompt: "Which hormone triggers ovulation during a natural menstrual cycle?",
      options: [
        "A. Prolactin",
        "B. Thyroxine",
        "C. Luteinizing hormone (LH)",
        "D. Insulin",
      ],
      key: 2, // C
      explanation: "The mid-cycle surge in pituitary Luteinizing Hormone (LH), stimulated by sustained high estradiol levels from the dominant follicle, triggers final oocyte maturation, resumption of meiosis I, and follicular rupture.",
    },
    {
      num: 7,
      topicCode: "BCRM-TOPIC-02",
      prompt: "Which hormone is primarily responsible for stimulating the growth of ovarian follicles?",
      options: [
        "A. Follicle-stimulating hormone (FSH)",
        "B. Oxytocin",
        "C. Human chorionic gonadotropin (hCG)",
        "D. Testosterone only",
      ],
      key: 0, // A
      explanation: "Follicle-Stimulating Hormone (FSH) secreted by anterior pituitary gonadotropes stimulates granulosa cell proliferation, aromatase expression, and progressive follicular growth.",
    },
    {
      num: 8,
      topicCode: "BCRM-TOPIC-02",
      prompt: "Where does fertilisation normally occur?",
      options: [
        "A. Cervix",
        "B. Uterine cavity",
        "C. Vagina",
        "D. Ampulla of the fallopian tube",
      ],
      key: 3, // D
      explanation: "Fertilisation of the mature secondary oocyte by capacitated sperm physiologically occurs in the widest section of the fallopian tube, the ampulla.",
    },
    {
      num: 9,
      topicCode: "BCRM-TOPIC-02",
      prompt: "Which hormone is mainly secreted by the corpus luteum after ovulation?",
      options: [
        "A. FSH",
        "B. Progesterone",
        "C. Prolactin",
        "D. Oxytocin",
      ],
      key: 1, // B
      explanation: "Following ovulation, the collapsed follicle transforms into the corpus luteum, which secretes substantial amounts of progesterone (and estradiol) to induce secretory transformation of the endometrium for implantation.",
    },
    {
      num: 10,
      topicCode: "BCRM-TOPIC-03",
      prompt: "Which organ produces sperm in the male reproductive system?",
      options: [
        "A. Prostate gland",
        "B. Seminal vesicle",
        "C. Testis",
        "D. Epididymis",
      ],
      key: 2, // C
      explanation: "Spermatogenesis occurs within the seminiferous tubules of the testes under the regulation of Sertoli cells, Leydig cell testosterone, and pituitary gonadotropins.",
    },
    {
      num: 11,
      topicCode: "BCRM-TOPIC-03",
      prompt: "Which investigation is generally the first-line test for evaluating male fertility?",
      options: [
        "A. Semen analysis",
        "B. Pelvic ultrasound",
        "C. Hysteroscopy",
        "D. HSG",
      ],
      key: 0, // A
      explanation: "Standard semen analysis according to WHO guidelines (evaluating volume, pH, sperm concentration, progressive motility, and normal morphology) is the indispensable cornerstone test in male evaluation.",
    },
    {
      num: 12,
      topicCode: "BCRM-TOPIC-03",
      prompt: "What does asthenozoospermia mean?",
      options: [
        "A. Absence of sperm in semen",
        "B. Low semen volume",
        "C. Abnormally shaped sperm only",
        "D. Reduced sperm motility",
      ],
      key: 3, // D
      explanation: "Asthenozoospermia denotes a lower percentage of progressively motile spermatozoa below WHO reference limits (< 32% progressive motility or < 40% total motility).",
    },
    {
      num: 13,
      topicCode: "BCRM-TOPIC-03",
      prompt: "What is azoospermia?",
      options: [
        "A. Reduced sperm concentration",
        "B. Complete absence of sperm in the ejaculate",
        "C. Reduced sperm motility",
        "D. Increased sperm DNA integrity",
      ],
      key: 1, // B
      explanation: "Azoospermia refers to the complete absence of spermatozoa in the ejaculate confirmed after centrifuged pellet examination on at least two separate occasions.",
    },
    {
      num: 14,
      topicCode: "BCRM-TOPIC-03",
      prompt: "Which structure is primarily responsible for sperm maturation and storage?",
      options: [
        "A. Prostate gland",
        "B. Urinary bladder",
        "C. Epididymis",
        "D. Seminal vesicle",
      ],
      key: 2, // C
      explanation: "The epididymis is the convoluted ductal structure adjacent to the testis where immotile testicular sperm acquire forward progressive motility, membrane stabilization, and functional fertilization competence.",
    },
    {
      num: 15,
      topicCode: "BCRM-TOPIC-03",
      prompt: "What does the sperm DNA fragmentation index (DFI) assess?",
      options: [
        "A. The extent of DNA damage in sperm",
        "B. The number of eggs in the ovary",
        "C. The thickness of the endometrium",
        "D. The volume of seminal fluid only",
      ],
      key: 0, // A
      explanation: "Sperm DFI measures the proportion of spermatozoa exhibiting single- or double-strand nuclear DNA breaks, which correlates with oxidative stress, impaired blastocyst development, and recurrent pregnancy loss.",
    },
    {
      num: 16,
      topicCode: "BCRM-TOPIC-04",
      prompt: "Polycystic ovary syndrome (PCOS) is commonly associated with which problem?",
      options: [
        "A. Premature menopause in every patient",
        "B. Bilateral tubal obstruction in every patient",
        "C. Absence of all ovarian follicles",
        "D. Ovulatory dysfunction",
      ],
      key: 3, // D
      explanation: "PCOS is the most common endocrinopathy in reproductive-age women, characterized by hyperandrogenism, polycystic ovarian morphology, and anovulation or oligo-ovulation.",
    },
    {
      num: 17,
      topicCode: "BCRM-TOPIC-04",
      prompt: "Which condition involves the presence of endometrial-like tissue outside the uterine cavity?",
      options: [
        "A. Adenomyosis only",
        "B. Endometriosis",
        "C. Cervical ectropion",
        "D. Vaginitis",
      ],
      key: 1, // B
      explanation: "Endometriosis is characterized by the presence of active endometrial stroma and epithelium in ectopic locations such as the ovaries, peritoneal surfaces, pelvic ligaments, and pouch of Douglas.",
    },
    {
      num: 18,
      topicCode: "BCRM-TOPIC-04",
      prompt: "Which of the following may directly impair natural conception by preventing sperm and egg from meeting?",
      options: [
        "A. Normal ovulation",
        "B. Normal ovarian reserve",
        "C. Bilateral fallopian tube obstruction",
        "D. Normal semen parameters",
      ],
      key: 2, // C
      explanation: "Bilateral tubal blockage mechanically prevents the ascension of sperm to the ampulla and precludes the pick-up and transport of the ovulated oocyte.",
    },
    {
      num: 19,
      topicCode: "BCRM-TOPIC-04",
      prompt: "Which hormone is commonly measured to assess thyroid function during infertility evaluation?",
      options: [
        "A. Thyroid-stimulating hormone (TSH)",
        "B. Anti-Müllerian hormone (AMH) only",
        "C. Progesterone only",
        "D. Testosterone only",
      ],
      key: 0, // A
      explanation: "Serum TSH is routinely measured; both subclinical and overt hypothyroidism can cause luteal phase defects, hyperprolactinemia, and anovulatory cycles.",
    },
    {
      num: 20,
      topicCode: "BCRM-TOPIC-04",
      prompt: "Which of the following is a common symptom of ovulatory dysfunction?",
      options: [
        "A. Normal ovulation every month",
        "B. Normal tubal patency",
        "C. Normal semen parameters",
        "D. Irregular or absent menstruation",
      ],
      key: 3, // D
      explanation: "Oligomenorrhea (cycles > 35 days) or amenorrhea (absence of menses for 6+ months) directly reflects chronic anovulation or dysovulation.",
    },
    {
      num: 21,
      topicCode: "BCRM-TOPIC-05",
      prompt: "What does antral follicle count (AFC) measure?",
      options: [
        "A. The number of embryos in the uterus",
        "B. The number of visible small antral follicles in the ovaries",
        "C. The number of sperm in semen",
        "D. The thickness of the cervix",
      ],
      key: 1, // B
      explanation: "AFC is determined by high-resolution transvaginal sonography in the early follicular phase, summing all 2-10 mm antral follicles in both ovaries to quantify functional ovarian reserve.",
    },
    {
      num: 22,
      topicCode: "BCRM-TOPIC-05",
      prompt: "Anti-Müllerian hormone (AMH) is primarily produced by which cells?",
      options: [
        "A. Endometrial cells",
        "B. Pituitary cells",
        "C. Granulosa cells of ovarian follicles",
        "D. Cervical cells",
      ],
      key: 2, // C
      explanation: "AMH is a dimeric glycoprotein secreted by the granulosa cells of primary, preantral, and small antral follicles (< 8 mm) in the ovary.",
    },
    {
      num: 23,
      topicCode: "BCRM-TOPIC-05",
      prompt: "Which ultrasound approach is commonly used for detailed assessment of the uterus and ovaries in infertility patients?",
      options: [
        "A. Transvaginal ultrasound (TVS)",
        "B. Chest ultrasound",
        "C. Cranial ultrasound",
        "D. Thyroid ultrasound",
      ],
      key: 0, // A
      explanation: "Transvaginal Sonography (TVS) places the high-frequency transducer in close proximity to pelvic organs, yielding superior spatial resolution for follicle counts, endometrial assessment, and ovarian pathology.",
    },
    {
      num: 24,
      topicCode: "BCRM-TOPIC-05",
      prompt: "What is one important clinical use of measuring ovarian reserve?",
      options: [
        "A. Confirming bilateral tubal patency",
        "B. Diagnosing every case of endometriosis",
        "C. Determining sperm morphology",
        "D. Helping estimate ovarian response to stimulation",
      ],
      key: 3, // D
      explanation: "Ovarian reserve markers (AMH and AFC) guide clinicians in individualizing gonadotropin dosing in IVF to optimize oocyte yield while preventing poor response or ovarian hyperstimulation syndrome (OHSS).",
    },
    {
      num: 25,
      topicCode: "BCRM-TOPIC-05",
      prompt: "Which statement about AMH is correct?",
      options: [
        "A. It directly confirms that natural conception will occur",
        "B. It helps assess ovarian reserve but does not independently predict natural conception",
        "C. It confirms tubal patency",
        "D. It measures sperm motility",
      ],
      key: 1, // B
      explanation: "AMH reflects quantitative follicular pool and response to stimulation, but women with low AMH can still ovulate quality oocytes each month; hence it does not predict spontaneous natural fecundity.",
    },
    {
      num: 26,
      topicCode: "BCRM-TOPIC-06",
      prompt: "What is the primary aim of ovulation induction?",
      options: [
        "A. To permanently suppress ovarian activity",
        "B. To block follicular development",
        "C. To stimulate the development of one or more ovarian follicles to facilitate ovulation",
        "D. To prevent fertilisation",
      ],
      key: 2, // C
      explanation: "The objective of ovulation induction is to achieve monofollicular (or pauci-follicular) growth and timely ovulation in anovulatory or oligo-ovulatory women.",
    },
    {
      num: 27,
      topicCode: "BCRM-TOPIC-06",
      prompt: "Which medication is commonly used for ovulation induction in women with PCOS?",
      options: [
        "A. Letrozole",
        "B. Insulin as a fertility drug for every patient",
        "C. Warfarin",
        "D. Furosemide",
      ],
      key: 0, // A
      explanation: "Letrozole, an oral aromatase inhibitor, is recommended by international evidence-based guidelines as the first-line oral ovulation induction agent in PCOS, showing superior live birth and ovulation rates over clomiphene.",
    },
    {
      num: 28,
      topicCode: "BCRM-TOPIC-06",
      prompt: "What is the main purpose of serial follicular monitoring?",
      options: [
        "A. To assess kidney function",
        "B. To measure sperm DNA fragmentation",
        "C. To assess lung function",
        "D. To monitor follicular growth and help guide treatment timing",
      ],
      key: 3, // D
      explanation: "Serial ultrasound scans track leading follicle diameter, endometrial trilaminar thickness, and help pinpoint timing for hCG trigger or timed intercourse/IUI while mitigating multiple pregnancy risks.",
    },
    {
      num: 29,
      topicCode: "BCRM-TOPIC-06",
      prompt: "Which medication is commonly used to trigger final oocyte maturation in assisted reproduction?",
      options: [
        "A. Levothyroxine",
        "B. Human chorionic gonadotropin (hCG)",
        "C. Metformin in every IVF cycle",
        "D. Paracetamol",
      ],
      key: 1, // B
      explanation: "Due to structural homology with LH and binding to the LH/CG receptor, urinary or recombinant hCG is widely administered to trigger final meiotic maturation of oocytes prior to IUI or ovum pick-up.",
    },
    {
      num: 30,
      topicCode: "BCRM-TOPIC-06",
      prompt: "What is ovarian hyperstimulation syndrome (OHSS)?",
      options: [
        "A. A condition caused by complete ovarian failure",
        "B. An infection of the fallopian tubes",
        "C. A potentially serious complication of ovarian stimulation",
        "D. A disorder affecting sperm morphology only",
      ],
      key: 2, // C
      explanation: "OHSS is an iatrogenic, potentially life-threatening complication of gonadotropin stimulation characterized by cystic ovarian enlargement and VEGF-mediated acute fluid extravasation into third spaces.",
    },
    {
      num: 31,
      topicCode: "BCRM-TOPIC-07",
      prompt: "What is the primary purpose of sperm washing and preparation before IUI?",
      options: [
        "A. To select a motile sperm population and remove seminal plasma and unwanted components",
        "B. To increase the number of eggs",
        "C. To stimulate ovulation directly",
        "D. To assess endometrial thickness",
      ],
      key: 0, // A
      explanation: "Sperm preparation techniques (density gradient centrifugation or swim-up) isolate viable, progressively motile sperm while eliminating prostaglandins, leukocytes, bacteria, and decapacitating seminal factors.",
    },
    {
      num: 32,
      topicCode: "BCRM-TOPIC-07",
      prompt: "What does IUI stand for?",
      options: [
        "A. Intrauterine Investigation",
        "B. Internal Uterine Implantation",
        "C. Intravenous Uterine Injection",
        "D. Intrauterine Insemination",
      ],
      key: 3, // D
      explanation: "IUI stands for Intrauterine Insemination, a therapeutic assisted reproductive procedure where concentrated processed sperm are placed directly into the uterine cavity via a thin catheter.",
    },
    {
      num: 33,
      topicCode: "BCRM-TOPIC-07",
      prompt: "In IUI, where is the prepared sperm sample placed?",
      options: [
        "A. Inside the ovary",
        "B. Inside the uterine cavity",
        "C. Inside the urinary bladder",
        "D. Inside the fallopian tube by surgery",
      ],
      key: 1, // B
      explanation: "The processed sperm suspension is injected atraumatically directly into the uterine cavity bypassing cervical mucus barriers.",
    },
    {
      num: 34,
      topicCode: "BCRM-TOPIC-07",
      prompt: "Which factor is important when selecting a patient for IUI?",
      options: [
        "A. Confirmed bilateral tubal obstruction without a suitable alternative pathway",
        "B. Absence of a uterine cavity",
        "C. At least one patent fallopian tube and an appropriate clinical indication",
        "D. Complete absence of ovulation without a treatment plan",
      ],
      key: 2, // C
      explanation: "Since fertilization in IUI occurs in vivo inside the fallopian tube, at least one healthy, patent fallopian tube is an absolute physiological prerequisite.",
    },
    {
      num: 35,
      topicCode: "BCRM-TOPIC-07",
      prompt: "Which complication is associated with multiple follicular development during ovulation induction?",
      options: [
        "A. Multiple pregnancy",
        "B. Improved tubal patency",
        "C. Permanent prevention of fertilisation",
        "D. Elimination of all pregnancy risks",
      ],
      key: 0, // A
      explanation: "Recruitment of multiple co-dominant follicles during ovulation induction or IUI cycles markedly elevates the risk of high-order multiple pregnancies and associated maternal-fetal morbidity.",
    },
    {
      num: 36,
      topicCode: "BCRM-TOPIC-08",
      prompt: "What is the primary purpose of cryopreservation in reproductive medicine?",
      options: [
        "A. To destroy all reproductive cells",
        "B. To prevent all future pregnancies",
        "C. To diagnose tubal obstruction",
        "D. To preserve gametes or embryos for future use",
      ],
      key: 3, // D
      explanation: "Cryopreservation allows long-term preservation of supernumerary embryos, oocytes, or spermatozoa in liquid nitrogen (-196°C) for fertility preservation or subsequent frozen embryo transfer (FET) cycles.",
    },
    {
      num: 37,
      topicCode: "BCRM-TOPIC-08",
      prompt: "Which technique is widely used for cryopreservation of human oocytes and embryos in modern IVF laboratories?",
      options: [
        "A. Centrifugation alone",
        "B. Vitrification",
        "C. Hysterosalpingography",
        "D. Follicular aspiration alone",
      ],
      key: 1, // B
      explanation: "Vitrification is an ultra-rapid cooling technique utilizing high cryoprotectant concentrations that transitions liquid into a glass-like solid state without damaging intracellular ice crystal formation.",
    },
    {
      num: 38,
      topicCode: "BCRM-TOPIC-08",
      prompt: "Which two cells normally fuse during fertilisation?",
      options: [
        "A. Two sperm cells",
        "B. Two ovarian follicle cells",
        "C. A sperm cell and an oocyte",
        "D. An endometrial cell and a sperm cell",
      ],
      key: 2, // C
      explanation: "Fertilisation involves the fusion of haploid male (spermatozoon) and female (mature metaphase II oocyte) gametes, restoring the diploid chromosome complement.",
    },
    {
      num: 39,
      topicCode: "BCRM-TOPIC-08",
      prompt: "What is a blastocyst?",
      options: [
        "A. An early embryo at a later preimplantation developmental stage, typically around day 5–6",
        "B. An unfertilised oocyte",
        "C. A mature sperm cell",
        "D. A uterine muscle cell",
      ],
      key: 0, // A
      explanation: "A blastocyst develops around Day 5–6 post-fertilization, consisting of a fluid-filled blastocoel cavity, inner cell mass (embryoblast), and outer trophectoderm layer.",
    },
    {
      num: 40,
      topicCode: "BCRM-TOPIC-08",
      prompt: "What is the primary role of the embryology laboratory in IVF?",
      options: [
        "A. To perform all maternal clinical examinations",
        "B. To conduct all surgical procedures independently",
        "C. To replace the role of the treating clinician",
        "D. To handle gametes and embryos and support fertilisation and embryo culture",
      ],
      key: 3, // D
      explanation: "The embryology laboratory provides controlled in vitro environments (temperature, gas mix, pH, culture media) to handle gametes, execute IVF/ICSI, culture embryos, and perform cryopreservation.",
    },
    {
      num: 41,
      topicCode: "BCRM-TOPIC-09",
      prompt: "What does IVF stand for?",
      options: [
        "A. Internal Vaginal Fertilisation",
        "B. In Vitro Fertilisation",
        "C. In Vivo Follicular assessment",
        "D. Intravenous Fertility treatment",
      ],
      key: 1, // B
      explanation: "IVF stands for In Vitro Fertilisation, meaning fertilization occurring outside the living organism in an artificial laboratory system.",
    },
    {
      num: 42,
      topicCode: "BCRM-TOPIC-09",
      prompt: "In conventional IVF, where does fertilisation occur?",
      options: [
        "A. Inside the fallopian tube",
        "B. Inside the uterus",
        "C. In a laboratory culture system",
        "D. Inside the cervix",
      ],
      key: 2, // C
      explanation: "In conventional IVF, harvested oocytes and prepared sperm are co-incubated in laboratory culture dishes inside specialized incubators.",
    },
    {
      num: 43,
      topicCode: "BCRM-TOPIC-09",
      prompt: "What is the purpose of ovarian stimulation during an IVF cycle?",
      options: [
        "A. To obtain multiple oocytes for treatment",
        "B. To permanently stop ovarian function",
        "C. To prevent follicular development",
        "D. To eliminate the need for embryo culture",
      ],
      key: 0, // A
      explanation: "Controlled ovarian stimulation with exogenous gonadotropins stimulates multiple follicles to develop simultaneously, maximizing the yield of mature oocytes and blastocysts.",
    },
    {
      num: 44,
      topicCode: "BCRM-TOPIC-09",
      prompt: "What does embryo transfer involve?",
      options: [
        "A. Removing the fallopian tubes",
        "B. Injecting sperm into the bloodstream",
        "C. Transferring ovarian tissue into the uterus",
        "D. Placing an embryo into the uterine cavity",
      ],
      key: 3, // D
      explanation: "Embryo transfer is the clinical procedure where one or more cultured embryos are gently loaded into a soft catheter and guided through the cervix into the uterine cavity for implantation.",
    },
    {
      num: 45,
      topicCode: "BCRM-TOPIC-09",
      prompt: "What is ICSI?",
      options: [
        "A. Intrauterine cervical screening investigation",
        "B. Intracytoplasmic sperm injection",
        "C. Internal cryogenic storage inspection",
        "D. Intraovarian hormone stimulation",
      ],
      key: 1, // B
      explanation: "ICSI (Intracytoplasmic Sperm Injection) is a specialized micromanipulation technique in which a single selected immobilised spermatozoon is injected directly into the cytoplasm of a mature MII oocyte.",
    },
    {
      num: 46,
      topicCode: "BCRM-TOPIC-10",
      prompt: "What is informed consent in assisted reproductive treatment?",
      options: [
        "A. Permission obtained without providing information",
        "B. A verbal instruction given only to hospital staff",
        "C. Voluntary agreement after receiving relevant information about the procedure, benefits and risks",
        "D. A document that removes all patient rights",
      ],
      key: 2, // C
      explanation: "Informed consent is the voluntary decision made by fully competent individuals after comprehensive disclosure of procedure indications, realistic success rates, risks, alternatives, and costs.",
    },
    {
      num: 47,
      topicCode: "BCRM-TOPIC-10",
      prompt: "How should patient reproductive and fertility records be handled?",
      options: [
        "A. Confidentially, with access restricted to authorised persons and appropriate lawful disclosures",
        "B. Shared publicly without permission",
        "C. Posted on social media for educational purposes without safeguards",
        "D. Discarded immediately after consultation",
      ],
      key: 0, // A
      explanation: "Patient reproductive and ART clinical records must be guarded under strict medical confidentiality, electronic security, and stored according to statutory retention protocols.",
    },
    {
      num: 48,
      topicCode: "BCRM-TOPIC-10",
      prompt: "What is the purpose of counselling before ART treatment?",
      options: [
        "A. To guarantee pregnancy",
        "B. To eliminate all treatment risks",
        "C. To replace medical investigations",
        "D. To help patients understand treatment options, limitations, risks and implications",
      ],
      key: 3, // D
      explanation: "Pre-treatment counselling provides psychological support, clarifies realistic expectations, explores ethical dilemmas, and aids patients in navigating complex assisted reproductive pathways.",
    },
    {
      num: 49,
      topicCode: "BCRM-TOPIC-10",
      prompt: "Which of the following is an important ethical principle in reproductive medicine?",
      options: [
        "A. Proceeding without patient consent",
        "B. Respecting patient autonomy and informed decision-making",
        "C. Disclosing patient information without justification",
        "D. Guaranteeing a successful outcome",
      ],
      key: 1, // B
      explanation: "Respect for patient autonomy, alongside non-maleficence, beneficence, and justice, is an uncompromisable biomedical ethics pillar.",
    },
    {
      num: 50,
      topicCode: "BCRM-TOPIC-10",
      prompt: "In India, which legislation specifically regulates assisted reproductive technology clinics and banks?",
      options: [
        "A. The Indian Contract Act, 1872, alone",
        "B. The Motor Vehicles Act, 1988",
        "C. The Assisted Reproductive Technology (Regulation) Act, 2021",
        "D. The Consumer Protection Act, 2019, alone",
      ],
      key: 2, // C
      explanation: "The Assisted Reproductive Technology (Regulation) Act, 2021, enacted by the Parliament of India, specifically governs registration, standards, gamete sourcing, and supervision of ART clinics and banks.",
    },
  ];

  const stripOptionPrefix = (opt: string) =>
    typeof opt === "string" ? opt.replace(/^(\([A-Da-d]\)|[A-Da-d][.)])\s*/, "") : opt;

  for (const q of rawQuestions) {
    const code = `BCRM-Q${q.num.toString().padStart(2, "0")}`;
    const topicId = topicMap[q.topicCode];
    const sanitizedOptions = q.options.map(stripOptionPrefix);

    const [existing] = await db.select({ id: questionBank.id }).from(questionBank).where(eq(questionBank.code, code));
    if (existing) {
      await db
        .update(questionBank)
        .set({
          topicId,
          difficulty: "core",
          cognitiveLevel: "clinical_management",
          clinicalVignette: q.prompt,
          questionPrompt: q.prompt,
          options: sanitizedOptions,
          correctOptionIndex: q.key,
          clinicalExplanation: q.explanation,
          status: "approved",
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(questionBank.id, existing.id));
    } else {
      await db.insert(questionBank).values({
        code,
        topicId,
        difficulty: "core",
        cognitiveLevel: "clinical_management",
        clinicalVignette: q.prompt,
        attachments: [],
        questionPrompt: q.prompt,
        options: sanitizedOptions,
        correctOptionIndex: q.key,
        clinicalExplanation: q.explanation,
        status: "approved",
        active: true,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Assessment Blueprints: Pre-Test & Exit-Test (50 Questions each)
  // ---------------------------------------------------------------------------
  const brmBlueprints = [
    {
      title: "Basic Course in Reproductive Medicine - Pre-Test Assessment",
      examType: "pre_test",
      totalQuestions: 50,
      durationMinutes: 20,
      passingPercentage: "70.00",
      hasNegativeMarking: false,
      negativeMarkingPenalty: "0.00",
      maxAttempts: 1, // Pre-test baseline attempt: 1 attempt only by default
      allowRetakes: false,
    },
    {
      title: "Basic Course in Reproductive Medicine - Exit-Test Certification Exam",
      examType: "exit_test",
      totalQuestions: 50,
      durationMinutes: 20,
      passingPercentage: "70.00",
      hasNegativeMarking: false,
      negativeMarkingPenalty: "0.00",
      maxAttempts: 1, // Exit-test locked down by default; admin must authorize retake
      allowRetakes: false,
    },
  ];

  for (const bp of brmBlueprints) {
    const [existing] = await db
      .select({ id: assessmentBlueprints.id })
      .from(assessmentBlueprints)
      .where(eq(assessmentBlueprints.title, bp.title));

    if (existing) {
      await db
        .update(assessmentBlueprints)
        .set({
          topicId: topicMap["BCRM-TOPIC-01"],
          examType: bp.examType,
          totalQuestions: bp.totalQuestions,
          durationMinutes: bp.durationMinutes,
          passingPercentage: bp.passingPercentage,
          hasNegativeMarking: bp.hasNegativeMarking,
          negativeMarkingPenalty: bp.negativeMarkingPenalty,
          maxAttempts: bp.maxAttempts,
          allowRetakes: bp.allowRetakes,
          active: true,
          updatedAt: new Date(),
        })
        .where(eq(assessmentBlueprints.id, existing.id));
    } else {
      await db.insert(assessmentBlueprints).values({
        topicId: topicMap["BCRM-TOPIC-01"],
        title: bp.title,
        examType: bp.examType,
        totalQuestions: bp.totalQuestions,
        durationMinutes: bp.durationMinutes,
        passingPercentage: bp.passingPercentage,
        hasNegativeMarking: bp.hasNegativeMarking,
        negativeMarkingPenalty: bp.negativeMarkingPenalty,
        maxAttempts: bp.maxAttempts,
        allowRetakes: bp.allowRetakes,
        active: true,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Candidates from Attached "Candidate Payment Status Sheet"
  // ---------------------------------------------------------------------------
  const attachedCandidates = [
    {
      candidateId: "ACME-BRM-260101",
      fullName: "Dr. Kosinea Samom",
      address: "Singjamei Chirom Leikai",
      mobile: "9206140008",
      email: "dr.kosinea.samom@gmail.com",
      qualifications: "MBBS",
      universityInstitute: "Saraswathi Institute of Medical Sciences, Hapur",
      yearOfPass: "2023",
      experience: "ENT Dept. JNIMS, 8 Months",
      primarySpecialty: "Reproductive Medicine Trainee",
      institutionName: "JNIMS, Imphal",
      candidateType: "external_trainee" as const,
      paymentTerm: "1st Installment",
      receivedAmount: "15000.00",
      paymentMode: "Online (Gpay)",
      transactionId: null,
      paymentDate: "2026-10-26",
    },
    {
      candidateId: "ACME-BRM-260102",
      fullName: "Dr. Nimi Tayenjam",
      address: "Keishamthong Top Leikai",
      mobile: "9787416802",
      email: "dr.nimi.tayenjam@gmail.com",
      qualifications: "MBBS, MS OBGY",
      universityInstitute: "JIPMER & RIMS",
      yearOfPass: "2019 & 2025",
      experience: "MO at PHC Hiyanglam 2025 till date",
      primarySpecialty: "Obstetrics & Gynecology",
      institutionName: "PHC Hiyanglam",
      candidateType: "external_trainee" as const,
      paymentTerm: "1st Installment",
      receivedAmount: "15000.00",
      paymentMode: "Online (Gpay)",
      transactionId: null,
      paymentDate: "2026-10-31",
    },
    {
      candidateId: "ACME-BRM-260103",
      fullName: "Dr. Phurailatpam Nishikanta Sharma",
      address: "Imphal",
      mobile: "9630710806",
      email: "dr.pnishikanta@gmail.com",
      qualifications: "MBBS",
      universityInstitute: "Regional Institute of Medical Sciences (RIMS)",
      yearOfPass: "2021",
      experience: "Clinical Practice",
      primarySpecialty: "General Medicine / Reproductive Health",
      institutionName: "Private Practice",
      candidateType: "external_trainee" as const,
      paymentTerm: "1st Installment",
      receivedAmount: "15000.00",
      paymentMode: "Online (Gpay)",
      transactionId: "667309465973",
      paymentDate: "2026-11-03",
    },
    {
      candidateId: "ACME-BRM-260104",
      fullName: "Dr. Tekcham Roshini Devi",
      address: "Thoubal Achouba, Melaground",
      mobile: "9856212952",
      email: "dr.roshini.tekcham@gmail.com",
      qualifications: "MBBS",
      universityInstitute: "JNIMS, Imphal",
      yearOfPass: "2017",
      experience: "RMO Langol View last Three Years",
      primarySpecialty: "Resident Medical Officer",
      institutionName: "Langol View Hospital",
      candidateType: "external_trainee" as const,
      paymentTerm: "Advance",
      receivedAmount: "5000.00",
      paymentMode: "Online (Phonepe)",
      transactionId: "60366615908",
      paymentDate: "2026-11-06",
    },
    {
      candidateId: "ACME-BRM-260105",
      fullName: "Dr. Ninita Athokpam",
      address: "Kwakeithel Thiyai Leikai",
      mobile: "8787460332",
      email: "dr.ninita.athokpam@gmail.com",
      qualifications: "MBBS & Fellowship In Family Medicine",
      universityInstitute: "RIMS / IMA",
      yearOfPass: "2018",
      experience: "MO at PHC Khoirom Thoubal",
      primarySpecialty: "Family Medicine / Maternal Health",
      institutionName: "PHC Khoirom Thoubal",
      candidateType: "external_trainee" as const,
      paymentTerm: "Advance",
      receivedAmount: "5000.00",
      paymentMode: "Online (Gpay)",
      transactionId: null,
      paymentDate: "2026-11-06",
    },
    {
      candidateId: "ACME-BRM-260106",
      fullName: "Dr. Kaneez Fatmah",
      address: "Kshetri Bengoon Mayai Leikai",
      mobile: "8826320131",
      email: "dr.kaneez.fatmah@gmail.com",
      qualifications: "MBBS, MD Anatomy & Fellowship in OBGY, Family Medicine, Diabetes",
      universityInstitute: "Kathmandu & Manipur University",
      yearOfPass: "2016",
      experience: "Consultant at Public Hospital",
      primarySpecialty: "Obstetrics & Gynecology / Reproductive Biology",
      institutionName: "Public Hospital, Imphal",
      candidateType: "external_trainee" as const,
      paymentTerm: "Advance",
      receivedAmount: "10000.00",
      paymentMode: "Online (Gpay)",
      transactionId: "667998669245",
      paymentDate: "2026-11-09",
    },
  ];

  const defaultPasswordHash = await hashPassword("Doctor@1234");

  for (const c of attachedCandidates) {
    // 1. User Account
    let [u] = await db.select({ id: user.id }).from(user).where(eq(user.email, c.email));
    let userId: string;
    if (!u) {
      userId = randomUUID();
      await db.insert(user).values({
        id: userId,
        name: c.fullName,
        email: c.email,
        emailVerified: true,
        role: "doctor_candidate",
        mustChangePassword: true,
        banned: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await db.insert(account).values({
        id: randomUUID(),
        accountId: c.email,
        providerId: "credential",
        userId,
        password: defaultPasswordHash,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } else {
      userId = u.id;
    }

    // 2. Doctor Profile
    let [prof] = await db.select({ id: doctorProfiles.id }).from(doctorProfiles).where(eq(doctorProfiles.email, c.email));
    let profileId: number;
    if (prof) {
      profileId = prof.id;
      await db
        .update(doctorProfiles)
        .set({
          userId,
          candidateId: c.candidateId,
          fullName: c.fullName,
          mobile: c.mobile,
          address: c.address,
          qualifications: c.qualifications,
          universityInstitute: c.universityInstitute,
          yearOfPassing: c.yearOfPass,
          experience: c.experience,
          primarySpecialty: c.primarySpecialty,
          institutionName: c.institutionName,
          candidateType: c.candidateType,
          status: "active",
          updatedAt: new Date(),
        })
        .where(eq(doctorProfiles.id, profileId));
    } else {
      const [insertedProf] = await db
        .insert(doctorProfiles)
        .values({
          userId,
          candidateId: c.candidateId,
          fullName: c.fullName,
          email: c.email,
          mobile: c.mobile,
          address: c.address,
          qualifications: c.qualifications,
          universityInstitute: c.universityInstitute,
          yearOfPassing: c.yearOfPass,
          experience: c.experience,
          primarySpecialty: c.primarySpecialty,
          institutionName: c.institutionName,
          candidateType: c.candidateType,
          status: "active",
        })
        .returning({ id: doctorProfiles.id });
      profileId = insertedProf.id;
    }

    // 3. Program Enrollment
    let [enr] = await db
      .select({ id: doctorEnrollments.id })
      .from(doctorEnrollments)
      .where(sql`${doctorEnrollments.doctorId} = ${profileId} AND ${doctorEnrollments.programId} = ${brmProgramId}`);

    let enrollmentId: number;
    if (!enr) {
      const [insertedEnr] = await db
        .insert(doctorEnrollments)
        .values({
          doctorId: profileId,
          programId: brmProgramId,
          batchCode: "ACME-BRM-2601",
          status: "enrolled",
        })
        .returning({ id: doctorEnrollments.id });
      enrollmentId = insertedEnr.id;
    } else {
      enrollmentId = enr.id;
    }

    // 4. Payment Entry
    const [existingPayment] = await db
      .select({ id: doctorPayments.id })
      .from(doctorPayments)
      .where(sql`${doctorPayments.doctorId} = ${profileId} AND ${doctorPayments.paymentDate} = ${c.paymentDate}`);

    if (!existingPayment) {
      await db.insert(doctorPayments).values({
        doctorId: profileId,
        enrollmentId,
        candidateId: c.candidateId,
        paymentTerm: c.paymentTerm,
        amount: c.receivedAmount,
        paymentMode: c.paymentMode,
        transactionId: c.transactionId,
        paymentDate: c.paymentDate,
        status: "verified",
        notes: `Recorded from Candidate Payment Status Sheet (${c.candidateId})`,
      });
    }
  }

  console.log("Successfully seeded 50 questions, 10 topics, and 6 enrolled doctors with fee records!");
}

// Allow direct CLI execution: tsx server/db/seed-doctor-cbt-dev.ts
if (process.argv[1]?.endsWith("seed-doctor-cbt-dev.ts")) {
  seedDoctorCbtDevData()
    .then(() => {
      console.log("Doctor CBT seed completed successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Doctor CBT seed failed:", err);
      process.exit(1);
    });
}
