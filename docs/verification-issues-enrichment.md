# 検証で検出された問題（充実化フェーズ）

> 自動生成: 2026-04-10T13:52:43.972Z
> 全300種の充実化バッチ処理で検出された懸念事項

## 凡例
- **学名不一致**: 入力データとWikipedia/iNaturalistで学名が異なる
- **toxicity要見直し**: 毒性分類が不適切の可能性
- **ソース不足**: Wikipedia/kinoco-zukan未掲載で検証困難
- **種同定**: 和名に対する種の同定に問題がある可能性

| # | id | issues | status | 対応 |
|---|-----|--------|--------|------|
| 1 | nameko | 学名について：入力データではPholiota namekoとなっているが、正式な学名はPholiota microsporaである。 | `open` | |
| 2 | bunashimeji | 入力データのWikipedia抽出では学名がAgaricus marmoreus（ハラタケ属）となっているが、正しくはHypsizygus marmoreus（シロタモギタケ属）である。分類もハラタケ科ではなくシメジ科が正しい。 | `open` | |
| 3 | aragekikurage | 学名について：入力データではAuricularia polytrichaとなっているが、現在の分子系統学的研究により学名の再検討が進んでおり、Auricularia cornea等に変更される可能性がある。 | `open` | |
| 4 | kuritake | Wikipediaの記述では「毒成分も含む」とされており、生食や加熱不十分での摂取は避ける必要がある。毒性分類は「食用」だが「食用要注意」に近い側面もある。 | `open` | |
| 5 | mukitake | 学名について：入力データではSarcomyxa serotinaとなっているが、2014年の研究により日本の一般的なムキタケ（黄色タイプ）はSarcomyxa edulis、緑色タイプはS. serotinaとして区別すべきとの提案がある。 | `open` | |
| 6 | koutake | 学名について：入力データではSarcodon imbricatusとなっているが、日本産のコウタケはSarcodon aspratus（別名として入力データにも記載あり）とする見解が有力。S. imbricatusはヨーロッパ産の近縁種で、日本産とは別種とされることが多い。Wikipediaの記事が取得できなかったため、主に既存データと一般的な菌類学知識に基づいて記述した。 | `open` | |
| 7 | numerisugi-take | Wikipediaの情報が見つからなかったため、記述はkinoco-zukanの情報と既存データに基づく。 | `open` | |
| 8 | houkitake | ホウキタケ属には下痢を起こす近縁種が複数存在するため、先端の赤紫色を確認して正確に同定する必要がある。 | `open` | |
| 9 | akayamadori | Wikipediaの抽出情報は曖昧さ回避ページのみで、菌類としての詳細情報は限定的。記述は既存データとkinoco-zukanの情報に基づく。 | `open` | |
| 10 | kurokawa | Wikipediaの情報が見つからなかったため、記述はkinoco-zukanの情報と既存データに基づく。 | `open` | |
| 11 | urabenihoteishimeji | 猛毒のクサウラベニタケとの判別が非常に難しく、毎年中毒事故が報告されている。経験者以外の採取は避けるべきである。 | `open` | |
| 12 | akamomitake | Wikipediaの情報が見つからなかったため、記述はkinoco-zukanの情報と既存データに基づく。 | `open` | |
| 13 | yamaiguchi | 生食すると中毒を起こすため、必ず加熱調理が必要。 | `open` | |
| 14 | shiroonitake | 従来は食毒不明とされていたが、有毒の可能性があるとみられている。毒成分の詳細は未解明。 | `open` | |
| 15 | kitsunenokarakasa | Wikipediaの情報が見つからず、kinoco-zukanにも未掲載のため、記述は既存データとiNaturalistの観察記録に基づく。毒成分の詳細は未解明。 | `open` | |
| 16 | kaburaasetake | Wikipediaの情報が見つからず、kinoco-zukanにも記載なし。現状のデータは一般的な菌学知識に基づく。 | `open` | |
| 17 | kotamagotengutake | Wikipediaおよびkinoco-zukanの情報が見つからず、一般的な菌学知識に基づく記述。 | `open` | |
| 18 | dokufusentake | Wikipediaおよびkinoco-zukanの情報が見つからず、一般的な菌学知識に基づく記述。日本での発生・中毒事例の詳細は限定的。 | `open` | |
| 19 | shaguma-amigasatake | toxicityが「edible_caution」だが、実質的には猛毒に近い。ジロミトリン（体内でモノメチルヒドラジンに変換）による肝障害・溶血・腎不全で死亡例がある。cooking_preservationとpoisoning_first_aidの両方に該当しうる特殊なケースであり、毒素情報の提示を検討すべき。 | `open` | |
| 20 | haiiroshimeji | Wikipediaでは「毒キノコの一つ」と記載されているが、アプリ上のtoxicityは「edible_caution」となっている。実際には消化器系中毒を起こす報告が複数あり、毒キノコとして扱うべきか再検討が必要。 | `open` | |
| 21 | chanametsumuratake | Wikipediaおよびkinoco-zukanの情報が見つからず、一般的な菌学知識に基づく記述。コレラタケとの混同リスクが高い点を強調すべき。 | `open` | |
| 22 | onifusbe | toxicityが「inedible」だが、Wikipediaによると幼菌は食べることができるとされている。edible_cautionへの変更を検討すべきか。 | `open` | |
| 23 | suppontake | toxicityが「inedible」だが、Wikipediaでは「悪臭がするが食用が可能で中華料理にも使用される」と記載。edible_cautionへの変更を検討すべきか。 | `open` | |
| 24 | kinugasatake | toxicityが「inedible」だが、中華料理で高級食材として利用されている（竹笙/竹蓀）。乾燥品が広く流通しており、edibleへの変更を検討すべきか。 | `open` | |
| 25 | kurohatsu | 猛毒のニセクロハツ（Russula subnigricans）と外見が酷似し、混同による死亡事例がある。ニセクロハツは傷つけると赤変したまま黒変しにくい点で区別できるが、野外での判別は極めて困難。inedibleだが混同リスクが高いため、毒キノコ並みの注意喚起が必要。 | `open` | |
| 26 | tsuchikaburi | 学名について、Russula delica とする見解と Lactarius piperatus とする見解が混在しており、分類学的整理が必要。 | `open` | |
| 27 | himekabairo-take | 入力データの学名Pluteus cervinus（ウラベニガサ科）とWikipedia記載の学名Xeromphalina campanella（Xeromphalinaceae科）が一致しない。形態記述もウラベニガサ科のものとヒメカバイロタケの特徴が混在している。学名・科の整合性を確認すべき。 | `open` | |
| 28 | suehirotake | ヒトへの日和見感染が報告されている。免疫不全患者においてアレルギー性気管支肺真菌症や副鼻腔炎を引き起こす事例がある。inedibleの範疇だが、病原性について注意喚起が望ましい。 | `open` | |
| 29 | sasakurehitoyotake | ヒトヨタケ属のきのこ全般にコプリン様物質を含む可能性が指摘されているが、本種についてはコプリンを含まないとする報告が多い。ただし念のためアルコールとの同時摂取は避けることが推奨される。 | `open` | |
| 30 | ooichoutake | 体質によって消化不良や胃腸障害を引き起こす報告がある。edibleだがedible_cautionに変更を検討すべき可能性がある。 | `open` | |
| 31 | momitake | 人によっては食後に嘔吐・腹痛を起こすとの報告があり（Wikipedia記載）、edible_cautionへの変更を検討すべき可能性がある。 | `open` | |
| 32 | shouro | 海外産に基づく学名Rhizopogon roseolusは変更される可能性が高いとWikipediaに記載あり。 | `open` | |
| 33 | numerisugitake-modoki | 入力データの学名Pholiota adiposaとWikipedia記載のPholiota ceriferaが異なる。近縁種の混同の可能性があるため確認が望ましい。 | `open` | |
| 34 | shimokoshi | ヨーロッパではTricholoma equestre（同種または近縁種）の大量摂取による横紋筋融解症の死亡例が報告されている。edible_cautionへの変更を検討すべき可能性がある。 | `open` | |
| 35 | koganetake | 可食とされるが中毒事例があり（Wikipedia記載）、toxicityをedible_cautionに変更すべき可能性がある | `open` | |
| 36 | kiamiashiiguchi | Wikipedia記載では学名がRetiboletus ornatipesで「食不適」とされている。入力データの学名Aureoboletus thibetanusとは異なる分類群の可能性がある。学名・食毒分類の再確認が必要。toxicityをedibleからinedibleまたはedible_cautionに変更すべき可能性がある | `open` | |
| 37 | komurasakishimeji | 入力データの学名Collybia nuda (= Lepista nuda)はムラサキシメジの学名であり、Wikipediaの記載どおりコムラサキシメジの学名はLepista sordidaが正しい。学名の修正が必要 | `open` | |
| 38 | tamagotengutake-modoki | 入力データではtoxicityがedibleとなっているが、Wikipediaでは「毒キノコの一つ」と明記されている。toxicityをtoxicに変更すべき。テングタケ属の同定は難しく、猛毒種との混同リスクもあるため食用は推奨できない | `open` | |
| 39 | houkitake-modoki | ホウキタケ属には消化器症状を引き起こす種が複数あり、正確な同定が重要。他のホウキタケ類との混同に注意が必要。 | `open` | |
| 40 | tsubaaburashimeji | フウセンタケ属には猛毒種が含まれるため、つばの有無をはじめとする本種の特徴を確実に確認してから食用にすること。 | `open` | |
| 41 | himesakurashimeji | イッポンシメジ属（Entoloma）には消化器系の中毒を引き起こす有毒種が多数含まれるため、正確な同定が不可欠。 | `open` | |
| 42 | kinchayamaiguchi | 生食や加熱不十分で消化器系の中毒症状（嘔吐・下痢）を起こすことがある。必ず十分に加熱調理してから食べること。特に柄は硬いため、しっかり火を通す必要がある。 | `open` | |
| 43 | shaguma-amigasatake-modoki | ギロミトリン（加水分解でモノメチルヒドラジンを生成する毒素）を含む。食用にする場合は必ず大量の水で繰り返し煮沸し、煮汁は全て捨てること。乾燥後も十分な加熱処理が必要。処理不十分の場合、肝障害・腎障害を起こす恐れがある。 | `open` | |
| 44 | akamomitake-modoki | 苦味が強いため、そのまま食べると不快感や消化不良を起こすことがある。十分に塩水にさらすか、煮こぼしてから調理する必要がある。アカモミタケとの区別が難しく、同定を誤ると調理法が合わない場合がある。 | `open` | |
| 45 | nioiwachichitake | 苦味と辛味が強く、そのまま食べると消化器症状（腹痛・下痢）を起こすことがある。食用にする場合は十分な塩漬けや煮こぼしなどの下処理が必須。他のチチタケ属の毒種との混同にも注意。 | `open` | |
| 46 | kawamurafusentake | フウセンタケ属（Cortinarius）には猛毒のオレラニンを含む種（コルチナリウス・オレラヌスなど）が存在し、外見が類似するため誤認の危険がある。本種の同定に自信がない場合は絶対に食べてはいけない。必ず専門家に同定を依頼すること。 | `open` | |
| 47 | ashibeniiguchi | 苦味が非常に強く、そのまま食べると嘔気・嘔吐を引き起こすことがある。食用にする場合は薄切りにして十分に水さらし・煮こぼしを繰り返す必要がある。苦味が抜けない場合は食べないこと。 | `open` | |
| 48 | kakishimeji-modoki | カキシメジ（Tricholoma ustale、毒）と外見が極めて似ており、確実な同定は困難。カキシメジを摂取すると激しい嘔吐・下痢・腹痛を起こす。両種の区別に自信がない場合は絶対に採取しないこと。 | `open` | |
| 49 | tsuchisugitake | 以前は食用とされていたが、消化器系の中毒報告（嘔吐・下痢・腹痛）が複数報告されている。個人差があり、同じ個体を食べても中毒する人としない人がいる。安全のため食べないことを推奨する。 | `open` | |
| 50 | niseshouro | 少量の摂取でも嘔吐・下痢・腹痛などの消化器症状を引き起こす。ショウロ（松露）と混同して食べる事故が報告されている。ショウロとは外皮の厚さ・硬さと内部の色で区別できるが、確実でない場合は食べないこと。 | `open` | |
| 51 | kusahatsu-modoki | 辛味成分が消化器を刺激し、生食や調理不十分な状態で食べると嘔吐・下痢・腹痛を起こす。食用にする場合は塩漬けや十分な加熱が必要。クサハツ（毒）など辛味のある近縁種との混同にも注意。 | `open` | |
| 52 | shirohatsu-modoki | 消化器症状（嘔吐・下痢・腹痛）の報告がある。シロハツ（Russula delica）やニセクロハツ（猛毒）など白色のベニタケ属は同定が難しく、誤認による重大な中毒事故が起きている。確実な同定ができない白色のベニタケ属は食べないこと。 | `open` | |
| 53 | honshimeji-modoki | 近年の研究で変異原性物質（リオフィリン）の含有が報告されている。また消化器系の中毒症状（嘔吐・下痢）の報告もある。白色のキノコはドクツルタケなど猛毒種との混同リスクもあり、食べないことを推奨する。 | `open` | |
| 54 | kishimeji-modoki | 消化器系の中毒症状（嘔吐・下痢・腹痛）が報告されている。個人差が大きく、体質によって症状の出方が異なる。安全のため食用にしないことを推奨する。キシメジ（毒性議論あり）との混同にも注意。 | `open` | |
| 55 | mureoofusentake | フウセンタケ属（Cortinarius）には腎毒性のオレラニンを含む猛毒種が複数存在する。本種は大型で比較的特徴的だが、他のフウセンタケ属との誤認は致命的な結果を招く。専門家による確実な同定なしには絶対に食べないこと。 | `open` | |
| 56 | awatake | 消化不良を起こしやすく、特に大量摂取や加熱不十分で胃腸障害（腹痛・下痢・嘔気）が起きる。また虫が付きやすく、虫食いの個体は傷みやすい。新鮮な若い個体を十分加熱して少量食べる程度にとどめること。 | `open` | |
| 57 | chawantake-modoki | 生食すると消化器系の中毒症状（嘔吐・下痢・腹痛）を起こす。食用にする場合は十分な加熱が必須。また、外見が似たチャワンタケ類には有毒種もあるため、正確な同定が必要。 | `open` | |
| 58 | hitoyotake-modoki | コプリン（ジスルフィラム様物質）を含み、飲酒前後数日以内に摂取すると顔面紅潮・動悸・嘔吐・頭痛などのアンタビュース様反応を起こす。アルコールとの併用は厳禁。飲酒習慣のある人は食べないこと。 | `open` | |
| 59 | kisamatsu-modoki | 近縁種のキシメジ（Tricholoma equestre）は以前食用とされていたが、横紋筋融解症の報告があり現在は毒キノコとされる。外見が似るため混同の危険がある。また他のキシメジ属毒種との誤認にも注意が必要。確実な同定が重要。 | `open` | |
| 60 | akayamatake | 一部で消化器系の中毒症状（腹痛・下痢）が報告されている。生食は絶対に不可。食用にする場合は十分に加熱すること。また小型のため他の有毒小型キノコとの混同にも注意が必要。 | `open` | |
| 61 | shiroonitake-modoki | テングタケ属（Amanita）にはドクツルタケ・シロタマゴテングタケなどアマトキシンを含む猛毒種が多数存在し、白色の種は特に混同リスクが高い。本種の同定を誤ると致死的な結果を招く。専門家の確認なしには絶対に食べないこと。 | `open` | |
| 62 | ooshirokarakasatake-modoki | Wikipedia・kinoco-zukanいずれも情報なし。ソース不足のため記述は既存データに基づく。 | `open` | |
| 63 | kusaurabenitake-modoki | Wikipedia・kinoco-zukanいずれも情報なし。学名Entoloma sinuatumは広義の分類で、日本産の本種が狭義の同種かは議論がある。 | `open` | |
| 64 | kakishimeji-doku | Wikipedia・kinoco-zukanいずれも情報なし。Tricholoma ustaloidesは主にヨーロッパで知られる種であり、日本産の「カキシメジモドキ」との同定関係は要確認。 | `open` | |
| 65 | tengutake-modoki | 学名Amanita pantherinaはヨーロッパのテングタケ（和名テングタケ）に相当する種であり、「テングタケモドキ」の学名としては疑問がある。日本固有の分類体系との整合性を要確認。 | `open` | |
| 66 | waraitake | 入力データの学名がGymnopilus junonius（オオワライタケ）となっているが、Wikipediaによると本来のワライタケはPanaeolus papilionaceus（ヒカゲタケ属の小型キノコ）である。学名の修正が必要。また、同バッチ内のoowaraitake-spと学名が重複している。 | `open` | |
| 67 | asetake | 学名Pseudosperma rimosumは、同バッチ内のookinuhadatomayatake（オオキヌハダトマヤタケ）のWikipediaにも同じ学名が記載されている。分類の整理が必要。 | `open` | |
| 68 | oowaraitake-modoki | Wikipedia・kinoco-zukanいずれも情報なし。ソース不足のため記述は既存データに基づく。 | `open` | |
| 69 | shirotamagotengutake-modoki | 毒性分類がtoxicだが、アマトキシンを含む致死性キノコであり、deadly_toxicへの変更を検討すべき。 | `open` | |
| 70 | kiibokasatake | Wikipediaでは「食毒不明であるが毒キノコとしても扱われる」とあり、毒性の確定度が低い。toxicの分類が適切か再検討の余地あり。 | `open` | |
| 71 | nigakuritake-modoki | Wikipedia・kinoco-zukanいずれも情報なし。学名Hypholoma lateritiumは「クリタケ」そのものの学名として使われることもあり、分類上の混乱がある可能性。確認が必要。 | `open` | |
| 72 | midorisugitake | 入力データの学名がHypholoma fasciculare（ニガクリタケ）となっているが、Wikipediaではミドリスギタケの学名はGymnopilus aeruginosus（チャツムタケ属）とされている。全く異なる属・種であり、学名の修正が必要。現在の記述はHypholoma fasciculareの形態が混在している可能性がある。 | `open` | |
| 73 | dokukarakasatake | 入力データの学名がLepiota brunneoincarnata（小型のアマトキシン含有猛毒キノコ）となっているが、Wikipediaでは和名ドクカラカサタケの学名はChlorophyllum neomastoideum（白い中型〜大型キノコ、消化器系毒）とされている。全く異なる種・属であり、学名・毒性分類の修正が必要。Lepiota brunneoincarnataはアマトキシンを含む猛毒種で | `open` | |
| 74 | ookogechaiiguchi | Wikipedia・kinoco-zukanいずれも情報なし。学名Paxillus involutusはヒダハタケとして知られ、和名「オオコゲチャイグチ」との対応が正しいか要確認。 | `open` | |
| 75 | kaburatengutake | 入力データの学名Amanita porphyriaとWikipediaの学名Amanita gymnopusが異なる。Amanita porphyriaは一般に「コテングタケモドキ」に対応する。正しい学名の確認が必要。 | `open` | |
| 76 | nisekurohatsu-modoki | 学名Russula densifoliaは同バッチ内のkurohatsu-modoki（クロハツモドキ）と同一。ニセクロハツモドキとクロハツモドキが同じ学名というのは不自然であり、いずれかの学名が誤っている可能性が高い。 | `open` | |
| 77 | tsukiyotake-modoki | Wikipedia・kinoco-zukanいずれも情報なし。Omphalotus japonicusはツキヨタケそのものの学名として知られており、「ツキヨタケモドキ」という別種に対応するかは要確認。 | `open` | |
| 78 | ookinuhadatomayatake | 入力データの学名Inocybe asterosporaとWikipediaの学名Pseudosperma rimosumが異なる。Pseudosperma rimosumは同バッチ内のasetake（アセタケ）と同一の学名であり、分類の整理が必要。 | `open` | |
| 79 | dokuajirogasa | 毒性分類がtoxicだが、アマトキシンを含む致死性キノコであり、deadly_toxicへの変更を検討すべき。 | `open` | |
| 80 | koreratake-modoki | 毒性分類がtoxicだが、アマトキシンを含む致死性キノコであり、deadly_toxicへの変更を検討すべき。Wikipedia・kinoco-zukanいずれも情報なし。 | `open` | |
| 81 | dokuyamadori-modoki | Wikipedia・kinoco-zukanいずれも情報なし。ソース不足のため記述は既存データに基づく。 | `open` | |
| 82 | shirotomayatake | Wikipedia・kinoco-zukanいずれも情報なし。ソース不足のため記述は既存データに基づく。 | `open` | |
| 83 | kokabuinushimeji | Wikipedia・kinoco-zukanいずれも情報なし。ソース不足のため記述は既存データに基づく。 | `open` | |
| 84 | oowaraitake-sp | 同バッチ内のwaraitake（ワライタケ）と学名Gymnopilus junoniusが重複している。本エントリは「オオワライタケ」を指すと考えられ、waraitakeの学名が誤っている可能性が高い。IDの整理が必要。 | `open` | |
| 85 | murasakishimeji-modoki | Wikipedia・kinoco-zukanいずれも情報なし。ソース不足のため記述は既存データに基づく。 | `open` | |
| 86 | dokubenidamashi | Wikipedia・kinoco-zukanいずれも情報なし。ソース不足のため記述は既存データに基づく。 | `open` | |
| 87 | kitsunenohanagasa | 入力データの学名Leucocoprinus birnbaumiiとWikipediaのLeucocoprinus fragilissimus（キツネノハナガサ）は異なる種。L. birnbaumiiは「コガネキヌカラカサタケ」に対応するのが一般的。和名と学名の対応を確認すべき。またWikipediaでは食毒不明とされており、toxicの分類が適切か再検討の余地あり。 | `open` | |
| 88 | karebakitsunetake | 学名 Laccaria amethystina はムラサキキツネタケの学名として広く知られている。カレバキツネタケとムラサキキツネタケは別種とする見解もあり、分類学的整理が必要。 | `open` | |
| 89 | nisematsutake | バカマツタケ（Tricholoma bakamatsutake）は一部では食用として評価されており、toxicとする分類には議論がある。近年の人工栽培研究の進展により食品としての安全性再評価が求められる可能性がある。 | `open` | |
| 90 | gantake-modoki | ヨーロッパでは広く食用とされているが、日本では有毒扱い。地域による食文化の違いがある。 | `open` | |
| 91 | haikaguratengutake | Wikipediaでの学名はAmanita sinensisとされているが、入力データではAmanita fuligineaとなっている。学名の整理が必要。 | `open` | |
| 92 | uramurasaki-shimeji | Paralepista flaccida（= Lepista inversa）は一部の文献では食用可能とされている場合もあり、deadly_toxicという分類が適切かどうか再検討が必要。 | `open` | |
| 93 | tengutakedamashi | Wikipediaおよびkinoco-zukanの情報が見つからず、詳細な毒素組成や中毒事例の一次資料が不足している。学名Amanita spissaceaの分類的位置づけが文献により異なる場合がある。 | `open` | |
| 94 | dokuhiratake | Wikipediaおよびkinoco-zukanの情報が見つからず、日本国内での発生・中毒事例に関する一次資料が不足している。Omphalotus属の分類は近年改訂が進んでおり、日本産個体群の学名が変更される可能性がある。 | `open` | |
| 95 | koganetengutake | Wikipediaおよびkinoco-zukanの情報が見つからず、国内での中毒事例や詳細な毒素分析に関する一次資料が不足している。 | `open` | |
| 96 | fukurotsuru-take-modoki | Wikipediaおよびkinoco-zukanの情報が見つからず、国内での正確な分布・中毒事例に関する一次資料が不足している。 | `open` | |
| 97 | kamemushitake | Wikipediaおよびkinoco-zukanの情報が見つからず、生態に関する詳細な一次資料が不足している。 | `open` | |
| 98 | hanasanagitake | Wikipediaおよびkinoco-zukanの情報が見つからず、詳細な生態情報の一次資料が不足している。 | `open` | |
| 99 | tsukutsukuboushi-take | Wikipediaおよびkinoco-zukanの情報が見つからず、分類・生態の一次資料が不足している。 | `open` | |
| 100 | buna-sarunokoshikake | Wikipediaおよびkinoco-zukanの情報が見つからないが、iNaturalistでは57,000件以上の観察記録があり世界的に普通種である。 | `open` | |
| 101 | oominokofukitake | 学名がGanodermaceae sp.と科レベルまでしか同定されておらず、正確な種の同定が必要。Wikipediaおよびkinoco-zukanの情報が見つからず、iNaturalistの観察記録もない。 | `open` | |
| 102 | chakaigaratake | Wikipediaおよびkinoco-zukanの情報が見つからず、iNaturalistの観察記録もない。国内での分布情報の一次資料が不足している。 | `open` | |
| 103 | sugiedatake | 入力データの学名はMycena cryptomeriicola（クヌギタケ属）だが、Wikipediaの記述ではStrobilurus ohshimae（マツカサキノコ属）とされており、学名・分類が一致しない。また、入力データではinedible（食不適）に分類されているが、Wikipediaでは「味が良い食用キノコ」と記載されている。種の同定と食毒区分の再確認が必要。 | `open` | |
| 104 | matsuouji | Wikipediaではシイタケと近縁の食用キノコと記載されているが、データ上のtoxicityはinedible。近縁のツバマツオウジとの混同による中毒報告があるため注意。toxicity分類の再確認を推奨。 | `open` | |
| 105 | momijiurokotake | iNaturalist観察記録が0件であり、分布情報の信頼性が限定的。taxonomyフィールドにorderとfamilyの情報が欠落している可能性あり。 | `open` | |
| 106 | tamakikurage | Wikipediaでは食用と記載されているが、データ上のtoxicityはinedible。toxicity分類の再確認を推奨。 | `open` | |
| 107 | tsunomatatake | Wikipediaでは食用キノコと記載されているが、データ上のtoxicityはinedible。学名がGuepinia helvelloidesとDacryopinax spathulariaで異なる可能性あり。種の同定とtoxicity分類の再確認を推奨。 | `open` | |
| 108 | zukintake | Wikipediaでは食用可と記載されているが、データ上のtoxicityはinedible。微量の有害成分を含むとの報告もあり、toxicity分類の再確認を推奨。 | `open` | |
