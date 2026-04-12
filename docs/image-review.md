# 画像レビュー

このドキュメントで図鑑画像の確認・指示を行います。

## 指示の書き方

各行の `status` と `instruction` 列を編集してください。

| status    | 意味                                      |
| --------- | ----------------------------------------- |
| `missing` | Wikipedia画像なし（対応が必要）           |
| `ok`      | 現状維持                                  |
| `replace` | 差し替え希望（instruction列に詳細を記入） |
| `manual`  | 手動で画像を配置済み                      |
| `skip`    | 対応不要（マイナー種など）                |

`instruction` 列の例:

- `Wikimedia Commons の File:Xxx.jpg を使用`
- `public/images/mushrooms/ に手動配置済み`
- `iNaturalist の写真で代替`

---

## ヒーロー画像なしの種

以下は `mushrooms.json` で `image_local` が空の種（全51種）です。

| id                         | 和名                       | 学名                          | 毒性   | status    | instruction                                                                                                                  |
| -------------------------- | -------------------------- | ----------------------------- | ------ | --------- | ---------------------------------------------------------------------------------------------------------------------------- |
| masshurumu                 | マッシュルーム             | Agaricus bisporus             | 食用   | `missing` | "C:\Users\asaku\Downloads\153716243910623232.webp"を設定、iNaturalistの画像が設定されていないので再検索                      |
| kinumerigasa               | キヌメリガサ               | Hygrophorus lucorum           | 食用   | `missing` | "C:\Users\asaku\Downloads\ダウンロード.jpg"を設定                                                                            |
| ootsuga-take               | オオツガタケ               | Tricholoma zelleri            | 食用   | `missing` | "C:\Users\asaku\Downloads\ootugatake-828x812.png"                                                                            |
| shimokoshi                 | シモコシ                   | Tricholoma auratum            | 食用   | `missing` | "C:\Users\asaku\Downloads\DSC_0293-768x512.jpg"                                                                              |
| ningyoutake                | ニンギョウタケ             | Albatrellus yasudae           | 食用   | `missing` | "C:\Users\asaku\Downloads\80c4900be202f9c8e29e0c28cead5111-414x311.jpg"を設定、iNaturalistの画像はおそらく間違いなので再検索 |
| yanagimatsutake            | ヤナギマツタケ             | Agrocybe cylindracea          | 食用   | `missing` | "C:\Users\asaku\Downloads\KIMG2895-1.webp"                                                                                   |
| akahatsu                   | アカハツ                   | Lactarius akahatsu            | 食用   | `missing` | "C:\Users\asaku\Downloads\153983420941205506.webp"                                                                           |
| aishimeji                  | アイシメジ                 | Lepista sordida               | 食用   | `missing` | "C:\Users\asaku\Downloads\unnamed.jpg"、iNaturalistの画像はおそらく間違いなので再検索                                        |
| chanametsumuratake-modoki  | チャナメツムタケモドキ     | Pholiota lubrica              | 食用   | `missing` | "C:\Users\asaku\Downloads\unnamed (1).jpg"                                                                                   |
| akajikou                   | アカジコウ                 | Boletus speciosus             | 食用   | `missing` | "C:\Users\asaku\Downloads\unnamed (2).jpg"                                                                                   |
| bunaharitake               | ブナハリタケ               | Mycoleptodonoides aitchisonii | 食用   | `missing` | "C:\Users\asaku\Downloads\bunaharitake.png"                                                                                  |
| numeritsubatake            | ヌメリツバタケ             | Mucidula mucida               | 食用   | `missing` | "C:\Users\asaku\Downloads\numeritsubatake_2_l.jpg"                                                                           |
| shakashimeji               | シャカシメジ               | Lyophyllum fumosum            | 食用   | `missing` | "C:\Users\asaku\Downloads\0736bb1f7bab9f09f16edd747634a127.jpg"                                                              |
| amitake-modoki             | アミタケモドキ             | Suillus pictus                | 食用   | `missing` |                                                                                                                              |
| shaguma-amigasatake-modoki | シャグマアミガサタケモドキ | Gyromitra gigas               | 要注意 | `missing` |                                                                                                                              |
| kusahatsu-modoki           | クサハツモドキ             | Russula laurocerasi           | 要注意 | `missing` |                                                                                                                              |
| shirohatsu-modoki          | シロハツモドキ             | Russula japonica              | 要注意 | `missing` |                                                                                                                              |
| honshimeji-modoki          | ホンシメジモドキ           | Lyophyllum connatum           | 要注意 | `missing` |                                                                                                                              |
| chawantake-modoki          | チャワンタケモドキ         | Peziza badia                  | 要注意 | `missing` |                                                                                                                              |
| ooshirokarakasatake-modoki | オオシロカラカサタケモドキ | Chlorophyllum neoapicale      | 毒     | `missing` |                                                                                                                              |
| hikageshibiretake          | ヒカゲシビレタケ           | Psilocybe argentipes          | 毒     | `missing` |                                                                                                                              |
| asetake                    | アセタケ                   | Inocybe fastigiata            | 毒     | `missing` |                                                                                                                              |
| koreratake-modoki          | コレラタケモドキ           | Galerina fasciculata          | 毒     | `missing` |                                                                                                                              |
| aikawatake                 | アイカワタケ               | Laetiporus versisporus        | 毒     | `missing` |                                                                                                                              |
| kuronigaiiguchi            | クロニガイグチ             | Tylopilus nigropurpureus      | 毒     | `missing` |                                                                                                                              |
| ooshiroonitake             | オオシロオニタケ           | Amanita virginoides           | 毒     | `missing` |                                                                                                                              |
| gantake-modoki             | ガンタケモドキ             | Amanita rubescens             | 毒     | `missing` |                                                                                                                              |
| kokiiroasetake             | コキイロアセタケ           | Inocybe erubescens            | 猛毒   | `missing` |                                                                                                                              |
| dokuajirogasa-modoki       | ドクアジロガサモドキ       | Galerina autumnalis           | 猛毒   | `missing` |                                                                                                                              |
| kitamagotengutake          | キタマゴテングタケ         | Amanita javanica              | 猛毒   | `missing` |                                                                                                                              |
| dokuamatake                | ドクアマタケ               | Amanita exitialis             | 猛毒   | `missing` |                                                                                                                              |
| uramurasaki-shimeji        | ウラムラサキシメジ         | Lepista inversa               | 猛毒   | `missing` |                                                                                                                              |
| tengutakedamashi           | テングタケダマシ           | Amanita spissacea             | 猛毒   | `missing` |                                                                                                                              |
| hanasanagitake             | ハナサナギタケ             | Isaria japonica               | 不食   | `missing` |                                                                                                                              |
| tsukutsukuboushi-take      | ツクツクボウシタケ         | Ophiocordyceps sobolifera     | 不食   | `missing` |                                                                                                                              |
| semitake                   | セミタケ                   | Ophiocordyceps heteropoda     | 不食   | `missing` |                                                                                                                              |
| kaigaratake                | カイガラタケ               | Lenzites betulina             | 不食   | `missing` |                                                                                                                              |
| uchiwatake                 | ウチワタケ                 | Microporus vernicipes         | 不食   | `missing` |                                                                                                                              |
| oominokofukitake           | オオミノコフキタケ         | Ganodermaceae sp.             | 不食   | `missing` |                                                                                                                              |
| chakaigaratake             | チャカイガラタケ           | Daedaleopsis tricolor         | 不食   | `missing` |                                                                                                                              |
| usubeniitachitake          | ウスベニイタチタケ         | Psathyrella candolleana       | 不食   | `missing` |                                                                                                                              |
| sakazukihourai-take        | サカズキホウライタケ       | Marasmius pulcherripes        | 不食   | `missing` |                                                                                                                              |
| enokitake-modoki           | エノキタケモドキ           | Flammulina rossica            | 不食   | `missing` |                                                                                                                              |
| sugiedatake                | スギエダタケ               | Mycena cryptomeriicola        | 不食   | `missing` |                                                                                                                              |
| himeshirotamogitake        | ヒメシロタモギタケ         | Ossicaulis lignatilis         | 不食   | `missing` |                                                                                                                              |
| hokoritake-modoki          | ホコリタケモドキ           | Lycoperdon pyriforme          | 不食   | `missing` |                                                                                                                              |
| kitsunenoefude             | キツネノエフデ             | Mutinus bambusinus            | 不食   | `missing` |                                                                                                                              |
| egonokitake                | エゴノキタケ               | Daedaleopsis styracina        | 不食   | `missing` |                                                                                                                              |
| aragekawakitake            | アラゲカワキタケ           | Panus lecomtei                | 不食   | `missing` |                                                                                                                              |
| urokotake                  | ウロコタケ                 | Hymenochaete rubiginosa       | 不食   | `missing` |                                                                                                                              |
| momijiurokotake            | モミジウロコタケ           | Hymenochaete yasudae          | 不食   | `missing` |                                                                                                                              |

---

## 差し替え希望

画像を差し替えたい種をここに追加してください。

| id  | 和名 | 現在の画像ソース | status    | instruction |
| --- | ---- | ---------------- | --------- | ----------- |
|     |      |                  | `replace` |             |
