#!/usr/bin/env python3
"""批量注入题库试题 — 初一~初三全学科"""
import sqlite3, json, os

DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'backend', 'data', 'exam.db')

def choice(subject, content, options_dict, answer):
    """选择题: options_dict = {'A': '...', 'B': '...', ...}"""
    opts = [{"label": k, "text": v} for k, v in options_dict.items()]
    return (subject, 'choice', content, json.dumps(opts, ensure_ascii=False), answer)

def fill(subject, content, answer):
    """填空题"""
    return (subject, 'fill', content, None, answer)

def get_questions():
    questions = []

    # ============================================================
    # 语文 (chinese) — 60 选择 + 60 填空 (覆盖初一~初三)
    # 来源：搜狐教育、f5cs 古诗词题库、各地期末联考中考真题
    # ============================================================

    chi_choice = [
        # --- 初一古诗词必背 ---
        choice('chinese', '"少壮不努力，老大徒______"出自《汉乐府·长歌行》。',
               {'A': '悲伤', 'B': '伤悲', 'C': '忧伤'}, 'B'),
        choice('chinese', '晏殊《浣溪沙》中"无可奈何花落去"的下句是______。',
               {'A': '似曾相识鸟归来', 'B': '似曾相识雁归来', 'C': '似曾相识燕归来'}, 'C'),
        choice('chinese', '《七步诗》的作者是______。',
               {'A': '曹操', 'B': '曹丕', 'C': '曹植'}, 'C'),
        choice('chinese', '杜甫《春夜喜雨》中"晓看红湿处"的下句是______。',
               {'A': '花重绵阳城', 'B': '花重锦州城', 'C': '花重锦官城'}, 'C'),
        choice('chinese', '"海内存知己，天涯若比邻"是______的诗句。',
               {'A': '王勃', 'B': '李白', 'C': '王维'}, 'A'),
        choice('chinese', '"人生自古谁无死，留取丹心照______"是文天祥的诗句。',
               {'A': '汉青', 'B': '汗青', 'C': '汗清'}, 'B'),
        choice('chinese', '"但使龙城飞将在，不教胡马度______"出自王昌龄《出塞》。',
               {'A': '阴山', 'B': '边关', 'C': '燕山'}, 'A'),
        choice('chinese', '杜牧《山行》"停车坐爱枫林晚"中"坐"的意思是______。',
               {'A': '因为', 'B': '坐下', 'C': '座位'}, 'A'),
        choice('chinese', '杜牧《江南春》中"南朝四百八十寺"的下句是______。',
               {'A': '多少楼台烟波中', 'B': '多少楼台风雨中', 'C': '多少楼台烟雨中'}, 'C'),
        choice('chinese', '"独在异乡为异客，每逢佳节倍思亲"是______的诗句。',
               {'A': '王维', 'B': '王之涣', 'C': '王勃'}, 'A'),
        choice('chinese', '《天净沙·秋思》的作者是元代______。',
               {'A': '张养浩', 'B': '马致远', 'C': '元好问'}, 'B'),
        choice('chinese', '"野火烧不尽，春风吹又生"出自______。',
               {'A': '白居易《赋得古原草送别》', 'B': '王昌龄《出塞》', 'C': '杜牧《江南春》'}, 'A'),
        choice('chinese', '"忽如一夜春风来，千树万树梨花开"写的是______。',
               {'A': '春色', 'B': '梨花', 'C': '雪景'}, 'C'),
        choice('chinese', '"春蚕到死丝方尽，蜡炬成灰泪始干"出自______的《无题》。',
               {'A': '李贺', 'B': '李清照', 'C': '李商隐'}, 'C'),
        choice('chinese', '"无边落木萧萧下，不尽长江滚滚来"出自杜甫的______。',
               {'A': '《茅屋为秋风所破歌》', 'B': '《登高》', 'C': '《蜀相》'}, 'B'),
        choice('chinese', '"莫愁前路无知己，天下谁人不识君"出自______的《别董大》。',
               {'A': '高适', 'B': '岑参', 'C': '王昌龄'}, 'A'),
        choice('chinese', '"正是江南好风景，落花时节又逢君"中的"君"指的是______。',
               {'A': '李延年', 'B': '李龟年', 'C': '李贺'}, 'B'),
        choice('chinese', '下列哪一位不是"初唐四杰"中的人物？',
               {'A': '王勃', 'B': '骆宾王', 'C': '王维'}, 'C'),
        choice('chinese', '分别号称"诗仙""诗圣""诗鬼"的诗人是______。',
               {'A': '李贺、杜甫、李商隐', 'B': '李白、李贺、杜甫', 'C': '李白、杜甫、李贺'}, 'C'),
        choice('chinese', '被人合称"王孟"的诗人是______。',
               {'A': '王维、孟浩然', 'B': '王昌龄、孟浩然', 'C': '王勃、孟郊'}, 'A'),
        # --- 初一~初二 文言文字词 ---
        choice('chinese', '《论语》中"学而不思则罔"的"罔"意思是______。',
               {'A': '迷惑', 'B': '没有', 'C': '渔网'}, 'A'),
        choice('chinese', '"温故而知新，可以为师矣"中"故"的意思是______。',
               {'A': '过去', 'B': '原因', 'C': '旧的（知识）'}, 'C'),
        choice('chinese', '下列加点字解释有误的一项是______。',
               {'A': '非淡泊无以明志（明确）', 'B': '非宁静无以致远（达到）', 'C': '俭以养德（修养）'}, 'C'),
        choice('chinese', '《世说新语》中"友人惭，下车引之"的"引"意思是______。',
               {'A': '引领', 'B': '拉', 'C': '引用'}, 'B'),
        choice('chinese', '"逝者如斯夫，不舍昼夜"中"逝"的意思是______。',
               {'A': '死亡', 'B': '流逝', 'C': '消失'}, 'B'),
        # --- 初二~初三 诗词鉴赏 ---
        choice('chinese', '王维《使至塞上》"大漠孤烟直，长河落日圆"描绘的是______。',
               {'A': '江南水乡', 'B': '塞外风光', 'C': '泰山日出'}, 'B'),
        choice('chinese', '李白《闻王昌龄左迁龙标遥有此寄》中表达的情感是______。',
               {'A': '喜悦之情', 'B': '对友人被贬的关切与同情', 'C': '壮志难酬的悲愤'}, 'B'),
        choice('chinese', '杜甫《望岳》"会当凌绝顶，一览众山小"表达了诗人______。',
               {'A': '及时行乐的思想', 'B': '不畏困难、敢于攀登的壮志', 'C': '退隐山林之念'}, 'B'),
        choice('chinese', '苏轼《水调歌头》"但愿人长久，千里共婵娟"中的"婵娟"指______。',
               {'A': '嫦娥', 'B': '月亮', 'C': '美人'}, 'B'),
        choice('chinese', '范仲淹《岳阳楼记》"先天下之忧而忧，后天下之乐而乐"体现了______。',
               {'A': '个人享乐主义', 'B': '忧国忧民的政治抱负', 'C': '退隐避世'}, 'B'),
        # --- 初三中考真题风格 ---
        choice('chinese', '下列句子中加点成语使用恰当的一项是______。',
               {'A': '他演讲时口若悬河，妙语连珠', 'B': '老师不耻下问，向我们请教问题', 'C': '他经常变本加厉地做好事'}, 'A'),
        choice('chinese', '下列句子没有语病的一项是______。',
               {'A': '通过这次活动，使我增长了见识', 'B': '能否刻苦学习是取得好成绩的关键', 'C': '我们要养成认真读书的好习惯'}, 'C'),
        choice('chinese', '下列标点符号使用正确的一项是______。',
               {'A': '"快走！"他喊道', 'B': '我喜欢吃苹果、香蕉、和橘子', 'C': "老师说：\u2018明天考试。\u2019"}, 'A'),
        choice('chinese', '下列句子中修辞手法判断正确的一项是______。',
               {'A': '春天像小姑娘，花枝招展的——拟人', 'B': '山舞银蛇，原驰蜡象——对偶', 'C': '白发三千丈，缘愁似个长——比喻'}, 'A'),
        choice('chinese', '下面关于名著《西游记》的表述，有误的一项是______。',
               {'A': '孙悟空第一个师傅是菩提祖师', 'B': '白龙马是西海龙王之子', 'C': '唐僧在流沙河收伏了猪八戒'}, 'C'),
        choice('chinese', '《水浒传》中"拳打镇关西"的好汉是______。',
               {'A': '鲁智深', 'B': '武松', 'C': '林冲'}, 'A'),
        choice('chinese', '下列选项中作家作品搭配有误的一项是______。',
               {'A': '鲁迅——《朝花夕拾》', 'B': '老舍——《骆驼祥子》', 'C': '朱自清——《红楼梦》'}, 'C'),
        choice('chinese', '《红楼梦》中"一个是阆苑仙葩，一个是美玉无瑕"分别指______。',
               {'A': '贾宝玉、林黛玉', 'B': '林黛玉、贾宝玉', 'C': '薛宝钗、贾宝玉'}, 'B'),
        choice('chinese', '下列句子中"之"的用法与其他不同的一项是______。',
               {'A': '学而时习之', 'B': '予独爱莲之出淤泥而不染', 'C': '知之者不如好之者'}, 'B'),
        choice('chinese', '"醉翁之意不在酒，在乎山水之间也"出自欧阳修的______。',
               {'A': '《岳阳楼记》', 'B': '《醉翁亭记》', 'C': '《小石潭记》'}, 'B'),
        # --- 古文阅读 ---
        choice('chinese', '《爱莲说》中"出淤泥而不染，濯清涟而不妖"赞美的是______。',
               {'A': '菊花的隐逸', 'B': '莲花的君子之德', 'C': '牡丹的富贵'}, 'B'),
        choice('chinese', '《马说》中"千里马常有，而伯乐不常有"的"伯乐"指______。',
               {'A': '善于相马的人', 'B': '善于识别人才的人', 'C': '一匹名马'}, 'B'),
        choice('chinese', '《桃花源记》的作者陶渊明是______时期的诗人。',
               {'A': '唐代', 'B': '宋代', 'C': '东晋'}, 'C'),
        choice('chinese', '下列对《陋室铭》理解有误的一项是______。',
               {'A': '作者借"陋室"表达安贫乐道的情趣', 'B': '文中以古代名贤自比', 'C': '作者认为陋室中有豪华的装饰'}, 'C'),
        choice('chinese', '"长风破浪会有时，直挂云帆济沧海"出自李白的______。',
               {'A': '《行路难》', 'B': '《将进酒》', 'C': '《望庐山瀑布》'}, 'A'),
        choice('chinese', '下列诗句中描写春天景色的是______。',
               {'A': '接天莲叶无穷碧，映日荷花别样红', 'B': '忽如一夜春风来，千树万树梨花开', 'C': '乱花渐欲迷人眼，浅草才能没马蹄'}, 'C'),
        choice('chinese', '下列对《送东阳马生序》理解不正确的是______。',
               {'A': '作者讲述了自己求学的艰难', 'B': '目的是勉励马生勤奋学习', 'C': '作者炫耀自己的成就'}, 'C'),
        choice('chinese', '"不以物喜，不以己悲"出自范仲淹的______。',
               {'A': '《醉翁亭记》', 'B': '《岳阳楼记》', 'C': '《小石潭记》'}, 'B'),
        choice('chinese', '下面哪一位被称为"唐宋八大家"之首？',
               {'A': '韩愈', 'B': '柳宗元', 'C': '欧阳修'}, 'A'),
        choice('chinese', '下列选项中不含通假字的一项是______。',
               {'A': '学而时习之，不亦说乎', 'B': '属予作文以记之', 'C': '山重水复疑无路'}, 'C'),
        # --- 记叙文/说明文阅读知识点 ---
        choice('chinese', '下列句子所用的说明方法判断正确的是______。',
               {'A': '这座桥长265米——举例子', 'B': '石拱桥的桥洞成弧形，就像虹——打比方', 'C': '赵州桥非常雄伟——作比较'}, 'B'),
        choice('chinese', '记叙文六要素不包括______。',
               {'A': '时间、地点、人物', 'B': '起因、经过、结果', 'C': '论点、论据、论证'}, 'C'),
        choice('chinese', '下列句子中引号的作用判断正确的是______。',
               {'A': '这就是"勤能补拙"的道理——引用', 'B': '他是我们班的"小诸葛"——强调', 'C': '下面请听诗朗诵"沁园春·雪"——反语'}, 'A'),
        choice('chinese', '"风声、雨声、读书声，声声入耳；家事、国事、天下事，事事关心"这副对联的作者是______。',
               {'A': '顾宪成', 'B': '林则徐', 'C': '文天祥'}, 'A'),
        choice('chinese', '下列词语中没有错别字的一项是______。',
               {'A': '再接再励', 'B': '谈笑风生', 'C': '迫不急待'}, 'B'),
        choice('chinese', '下列句子顺序排列正确的一项是______。\n①因此，我们必须珍惜时间\n②时间就是生命\n③浪费时间就是浪费生命\n④时间就是金钱',
               {'A': '②④③①', 'B': '②③④①', 'C': '④②③①'}, 'A'),
        choice('chinese', '"沉舟侧畔千帆过，病树前头万木春"的作者是______。',
               {'A': '刘禹锡', 'B': '白居易', 'C': '杜牧'}, 'A'),
        choice('chinese', '下面关于《骆驼祥子》的说法正确的是______。',
               {'A': '祥子最终实现了买车的梦想', 'B': '祥子经历了三起三落', 'C': '虎妞是祥子的初恋'}, 'B'),
        choice('chinese', '辛弃疾《破阵子》"醉里挑灯看剑，梦回吹角连营"表达了______。',
               {'A': '对田园生活的向往', 'B': '杀敌报国的壮志', 'C': '离愁别绪'}, 'B'),
        choice('chinese', '陆游《游山西村》"山重水复疑无路，柳暗花明又一村"蕴含的哲理是______。',
               {'A': '悲观失望', 'B': '困境中坚持就能看到希望', 'C': '及时行乐'}, 'B'),
    ]
    questions.extend(chi_choice)

    chi_fill = [
        fill('chinese', '"______，春风不度玉门关。"（王之涣《凉州词》）', '羌笛何须怨杨柳'),
        fill('chinese', '"______，润物细无声。"（杜甫《春夜喜雨》）', '随风潜入夜'),
        fill('chinese', '"______，千里共婵娟。"（苏轼《水调歌头》）', '但愿人长久'),
        fill('chinese', '"落红不是无情物，______。"（龚自珍《己亥杂诗》）', '化作春泥更护花'),
        fill('chinese', '"______，柳暗花明又一村。"（陆游《游山西村》）', '山重水复疑无路'),
        fill('chinese', '"问渠那得清如许？______。"（朱熹《观书有感》）', '为有源头活水来'),
        fill('chinese', '"______，一览众山小。"（杜甫《望岳》）', '会当凌绝顶'),
        fill('chinese', '"______，蜡炬成灰泪始干。"（李商隐《无题》）', '春蚕到死丝方尽'),
        fill('chinese', '"______，思而不学则殆。"（《论语》）', '学而不思则罔'),
        fill('chinese', '"三人行，______。"（《论语》）', '必有我师焉'),
        fill('chinese', '"______，不亦乐乎？"（《论语》）', '有朋自远方来'),
        fill('chinese', '"______，非宁静无以致远。"（诸葛亮《诫子书》）', '非淡泊无以明志'),
        fill('chinese', '"______，出则无敌国外患者，国恒亡。"（《孟子》）', '入则无法家拂士'),
        fill('chinese', '"______，在乎山水之间也。"（欧阳修《醉翁亭记》）', '醉翁之意不在酒'),
        fill('chinese', '"______，后天下之乐而乐。"（范仲淹《岳阳楼记》）', '先天下之忧而忧'),
        fill('chinese', '"______，百草丰茂。"（曹操《观沧海》）', '树木丛生'),
        fill('chinese', '"乱花渐欲迷人眼，______。"（白居易《钱塘湖春行》）', '浅草才能没马蹄'),
        fill('chinese', '"______，小桥流水人家。"（马致远《天净沙·秋思》）', '枯藤老树昏鸦'),
        fill('chinese', '"______，若出其中；星汉灿烂，若出其里。"（曹操《观沧海》）', '日月之行'),
        fill('chinese', '"______，悠然见南山。"（陶渊明《饮酒》）', '采菊东篱下'),
        fill('chinese', '"我寄愁心与明月，______。"（李白《闻王昌龄左迁龙标遥有此寄》）', '随君直到夜郎西'),
        fill('chinese', '"______，影入平羌江水流。"（李白《峨眉山月歌》）', '峨眉山月半轮秋'),
        fill('chinese', '"马上相逢无纸笔，______。"（岑参《逢入京使》）', '凭君传语报平安'),
        fill('chinese', '"______，双袖龙钟泪不干。"（岑参《逢入京使》）', '故园东望路漫漫'),
        fill('chinese', '"商女不知亡国恨，______。"（杜牧《泊秦淮》）', '隔江犹唱后庭花'),
        fill('chinese', '"______，夜泊秦淮近酒家。"（杜牧《泊秦淮》）', '烟笼寒水月笼沙'),
        fill('chinese', '"可怜夜半虚前席，______。"（李商隐《贾生》）', '不问苍生问鬼神'),
        fill('chinese', '"______，一山放出一山拦。"（杨万里《过松源晨炊漆公店》）', '政入万山围子里'),
        fill('chinese', '"黄梅时节家家雨，______。"（赵师秀《约客》）', '青草池塘处处蛙'),
        fill('chinese', '"______，赚得行人错喜欢。"（杨万里《过松源晨炊漆公店》）', '莫言下岭便无难'),
        fill('chinese', '"念天地之悠悠，______。"（陈子昂《登幽州台歌》）', '独怆然而涕下'),
        fill('chinese', '"______，决眦入归鸟。"（杜甫《望岳》）', '荡胸生曾云'),
        fill('chinese', '"不畏浮云遮望眼，______。"（王安石《登飞来峰》）', '自缘身在最高层'),
        fill('chinese', '"______，丰年留客足鸡豚。"（陆游《游山西村》）', '莫笑农家腊酒浑'),
        fill('chinese', '"落霞与孤鹜齐飞，______。"（王勃《滕王阁序》）', '秋水共长天一色'),
        fill('chinese', '"______，大庇天下寒士俱欢颜。"（杜甫《茅屋为秋风所破歌》）', '安得广厦千万间'),
        fill('chinese', '"______，柳暗花明又一村。"中的"村"指______。', '山重水复疑无路'),
        fill('chinese', '《诗经》是我国第一部______总集，分为风、雅、颂三部分。', '诗歌'),
        fill('chinese', '成语"温故知新"出自______。', '《论语》'),
        fill('chinese', '《阿长与〈山海经〉》的作者是______。', '鲁迅'),
        fill('chinese', '"烽火连三月，______。"（杜甫《春望》）', '家书抵万金'),
        fill('chinese', '《岳阳楼记》中描写洞庭湖早晚景色的句子是"______，气象万千"。', '朝晖夕阴'),
        fill('chinese', '《出师表》中诸葛亮向后主提出的三条建议中核心的一条是______。', '亲贤臣，远小人'),
        fill('chinese', '《记承天寺夜游》中描写月光的句子是"庭下如积水空明，______，盖竹柏影也。"', '水中藻荇交横'),
        fill('chinese', '"大漠孤烟直，______。"（王维《使至塞上》）', '长河落日圆'),
        fill('chinese', '"几处早莺争暖树，______。"（白居易《钱塘湖春行》）', '谁家新燕啄春泥'),
        fill('chinese', '"晴川历历汉阳树，______。"（崔颢《黄鹤楼》）', '芳草萋萋鹦鹉洲'),
        fill('chinese', '"______，志在千里。"（曹操《龟虽寿》）', '老骥伏枥'),
        fill('chinese', '中国古代四大名著是《西游记》《水浒传》《三国演义》和______。', '《红楼梦》'),
        fill('chinese', '《孟子》中"______，贫贱不能移，威武不能屈"被称为"大丈夫"的标准。', '富贵不能淫'),
        fill('chinese', '《小石潭记》中描写潭水清澈的句子是"潭中鱼可百许头，______。"', '皆若空游无所依'),
        fill('chinese', '"______，奉命于危难之间。"（诸葛亮《出师表》）', '受任于败军之际'),
        fill('chinese', '予独爱莲之出淤泥而不染，______。（周敦颐《爱莲说》）', '濯清涟而不妖'),
        fill('chinese', '《邹忌讽齐王纳谏》中邹忌通过______的方式向齐王进谏。', '设喻（类比）'),
        fill('chinese', '"______，千树万树梨花开。"（岑参《白雪歌送武判官归京》）', '忽如一夜春风来'),
        fill('chinese', '"______，化作春泥更护花。"中"红"指______。', '落红不是无情物'),
        fill('chinese', '《鱼我所欲也》的中心论点是"______，舍生而取义者也。"', '二者不可得兼'),
        fill('chinese', '______是一部记录孔子及其弟子言行的语录体散文集。', '《论语》'),
        fill('chinese', '"______，赢得生前身后名。"（辛弃疾《破阵子》）', '了却君王天下事'),
        fill('chinese', '"知之者不如好之者，______。"（《论语》）', '好之者不如乐之者'),
    ]
    questions.extend(chi_fill)

    # ============================================================
    # 数学 (math) — 60 选择 + 60 填空
    # 初一：有理数/整式/一元一次方程；初二：实数/函数/三角形/四边形；
    # 初三：二次函数/圆/相似/概率统计
    # ============================================================

    math_choice = [
        # --- 初一 有理数与实数 ---
        choice('math', '-3的绝对值是______。', {'A': '-3', 'B': '3', 'C': '±3', 'D': '1/3'}, 'B'),
        choice('math', '下列各数中，是无理数的是______。', {'A': '0.5', 'B': '22/7', 'C': '√2', 'D': '-5'}, 'C'),
        choice('math', '计算：(-2)³ = ______。', {'A': '-6', 'B': '-8', 'C': '6', 'D': '8'}, 'B'),
        choice('math', '数轴上点A表示-2，将点A向右移动5个单位，则终点表示的数是______。', {'A': '-7', 'B': '3', 'C': '7', 'D': '-3'}, 'B'),
        choice('math', '下列运算正确的是______。', {'A': '3a+2b=5ab', 'B': 'a²·a³=a⁶', 'C': '(a²)³=a⁶', 'D': 'a⁶÷a²=a³'}, 'C'),
        choice('math', '若|a|=-a，则a是______。', {'A': '正数', 'B': '负数', 'C': '非正数', 'D': '非负数'}, 'C'),
        choice('math', '下列各式中，是一元一次方程的是______。', {'A': 'x²-1=0', 'B': '2x+3y=5', 'C': '2x-1=3', 'D': '1/x=2'}, 'C'),
        choice('math', '方程2x-3=7的解是______。', {'A': 'x=2', 'B': 'x=5', 'C': 'x=-2', 'D': 'x=10'}, 'B'),
        choice('math', '-5的倒数是______。', {'A': '5', 'B': '1/5', 'C': '-1/5', 'D': '-5'}, 'C'),
        choice('math', '如果收入100元记作+100元，那么支出50元记作______。', {'A': '+50元', 'B': '-50元', 'C': '+150元', 'D': '-150元'}, 'B'),
        # --- 初一 整式加减 ---
        choice('math', '单项式-3x²y的系数和次数分别是______。', {'A': '-3，2', 'B': '-3，3', 'C': '3，2', 'D': '3，3'}, 'B'),
        choice('math', '下列各组中，是同类项的是______。', {'A': '2x³与3x²', 'B': '5ab与5abc', 'C': '-xy与3yx', 'D': '2²与x²'}, 'C'),
        choice('math', '化简：3a-(2a-1) = ______。', {'A': 'a+1', 'B': 'a-1', 'C': '5a-1', 'D': '5a+1'}, 'A'),
        choice('math', '计算 (2x-3)(x+2) 的结果是______。', {'A': '2x²+x-6', 'B': '2x²-x-6', 'C': '2x²+7x-6', 'D': '2x²+x+6'}, 'A'),
        choice('math', '已知x=-2，则代数式x²-3x+1的值是______。', {'A': '-1', 'B': '3', 'C': '7', 'D': '11'}, 'D'),
        # --- 初二 三角形与全等 ---
        choice('math', '下列长度的三条线段能组成三角形的是______。', {'A': '1，2，3', 'B': '3，4，8', 'C': '5，6，10', 'D': '5，5，11'}, 'C'),
        choice('math', '一个三角形三个内角的度数比为1:2:3，这个三角形是______。', {'A': '锐角三角形', 'B': '直角三角形', 'C': '钝角三角形', 'D': '等腰三角形'}, 'B'),
        choice('math', '等腰三角形的一个底角为50°，则其顶角为______。', {'A': '50°', 'B': '65°', 'C': '80°', 'D': '100°'}, 'C'),
        choice('math', '正五边形的内角和是______。', {'A': '360°', 'B': '540°', 'C': '720°', 'D': '900°'}, 'B'),
        choice('math', '下列条件中，不能判定两个三角形全等的是______。', {'A': 'SSS', 'B': 'SAS', 'C': 'SSA', 'D': 'ASA'}, 'C'),
        # --- 初二 轴对称与坐标系 ---
        choice('math', '点P(-3, 4)关于x轴对称的点的坐标是______。', {'A': '(3, 4)', 'B': '(-3, -4)', 'C': '(3, -4)', 'D': '(-3, 4)'}, 'B'),
        choice('math', '点A(2, -3)到x轴的距离是______。', {'A': '2', 'B': '-3', 'C': '3', 'D': '5'}, 'C'),
        choice('math', '若点P(m, 2)在第三象限，则m______。', {'A': 'm>0', 'B': 'm<0', 'C': 'm=0', 'D': 'm≠0'}, 'B'),
        # --- 初二 分式 ---
        choice('math', '使分式 x/(x-2) 有意义的x的取值范围是______。', {'A': 'x≠0', 'B': 'x≠2', 'C': 'x≠-2', 'D': 'x为任意实数'}, 'B'),
        choice('math', '化简分式 (a²-1)/(a+1) 的结果是______。', {'A': 'a', 'B': 'a-1', 'C': 'a+1', 'D': '1-a'}, 'B'),
        # --- 初三 一元二次方程 ---
        choice('math', '方程x²-4x+3=0的两个根是______。', {'A': 'x₁=1，x₂=3', 'B': 'x₁=-1，x₂=-3', 'C': 'x₁=1，x₂=-3', 'D': 'x₁=-1，x₂=3'}, 'A'),
        choice('math', '一元二次方程x²-2x+1=0的根的情况是______。', {'A': '有两个不相等实根', 'B': '有两个相等实根', 'C': '无实根', 'D': '无法判断'}, 'B'),
        choice('math', '若关于x的方程x²+kx+4=0有两个相等实根，则k=______。', {'A': '±2', 'B': '±4', 'C': '4', 'D': '-4'}, 'B'),
        # --- 初三 二次函数 ---
        choice('math', '抛物线y=(x-1)²+2的顶点坐标是______。', {'A': '(1, 2)', 'B': '(-1, 2)', 'C': '(1, -2)', 'D': '(-1, -2)'}, 'A'),
        choice('math', '抛物线y=-2x²+4x-1的开口方向和对称轴分别是______。', {'A': '向下，x=1', 'B': '向上，x=1', 'C': '向下，x=-1', 'D': '向上，x=-1'}, 'A'),
        choice('math', '将抛物线y=x²先向左平移2个单位，再向上平移3个单位，得到的解析式是______。', {'A': 'y=(x-2)²+3', 'B': 'y=(x+2)²+3', 'C': 'y=(x-2)²-3', 'D': 'y=(x+2)²-3'}, 'B'),
        choice('math', '二次函数y=ax²+bx+c中，若a<0且b²-4ac>0，则函数图像与x轴的交点个数是______。', {'A': '0', 'B': '1', 'C': '2', 'D': '3'}, 'C'),
        choice('math', '对于抛物线y=x²-2x-3，当y<0时，x的取值范围是______。', {'A': 'x<-1或x>3', 'B': '-1<x<3', 'C': 'x<1', 'D': 'x>3'}, 'B'),
        # --- 初三 圆 ---
        choice('math', '在同圆中，下列结论正确的是______。', {'A': '弦心距相等则弦相等', 'B': '弦越长弦心距越大', 'C': '等弧所对的圆心角一定相等', 'D': '直径是最短的弦'}, 'C'),
        choice('math', '已知圆心O的半径为5，点P到圆心O的距离为3，则点P在______。', {'A': '圆外', 'B': '圆上', 'C': '圆内', 'D': '无法判断'}, 'C'),
        choice('math', '一条弧所对的圆周角为30°，则它所对的圆心角为______。', {'A': '15°', 'B': '30°', 'C': '60°', 'D': '90°'}, 'C'),
        choice('math', '半径为6的圆中，60°圆心角所对的弧长是______。', {'A': 'π', 'B': '2π', 'C': '3π', 'D': '6π'}, 'B'),
        # --- 初三 相似三角形 ---
        choice('math', '若△ABC∽△DEF，且AB:DE=2:3，则△ABC与△DEF的面积比为______。', {'A': '2:3', 'B': '3:2', 'C': '4:9', 'D': '9:4'}, 'C'),
        choice('math', '如图，DE∥BC，AD=2，DB=3，则DE:BC=______。', {'A': '2:3', 'B': '2:5', 'C': '3:5', 'D': '1:2'}, 'B'),
        # --- 初三 锐角三角函数 ---
        choice('math', '在Rt△ABC中，∠C=90°，AB=5，BC=3，则sinA=______。', {'A': '3/5', 'B': '4/5', 'C': '3/4', 'D': '4/3'}, 'A'),
        choice('math', 'sin30°+cos60°的值是______。', {'A': '1', 'B': '1/2', 'C': '√3/2', 'D': '√2/2'}, 'A'),
        choice('math', '在Rt△ABC中，∠C=90°，若tanA=1，则∠A=______。', {'A': '30°', 'B': '45°', 'C': '60°', 'D': '75°'}, 'B'),
        # --- 初三 统计与概率 ---
        choice('math', '一组数据：2，3，5，5，7的众数是______。', {'A': '2', 'B': '3', 'C': '5', 'D': '7'}, 'C'),
        choice('math', '一组数据1，2，3，4，5的方差是______。', {'A': '1', 'B': '√2', 'C': '2', 'D': '3'}, 'C'),
        choice('math', '一个不透明的袋子中有3个红球和2个白球，从中随机摸出一个球，摸到红球的概率是______。', {'A': '1/5', 'B': '2/5', 'C': '3/5', 'D': '2/3'}, 'C'),
        choice('math', '同时抛掷两枚硬币，两枚都是正面的概率是______。', {'A': '1/2', 'B': '1/3', 'C': '1/4', 'D': '1/6'}, 'C'),
        choice('math', '一组数据的平均数为10，每个数据都加5后，新数据的平均数是______。', {'A': '5', 'B': '10', 'C': '15', 'D': '50'}, 'C'),
        # --- 综合（初二~初三）---
        choice('math', '下列函数中，y随x增大而减小的是______。', {'A': 'y=2x', 'B': 'y=-x+1', 'C': 'y=x²(x>0)', 'D': 'y=1/x(x<0)'}, 'B'),
        choice('math', '不等式组{x>2, x≤5}的解集是______。', {'A': 'x>2', 'B': 'x≤5', 'C': '2<x≤5', 'D': '无解'}, 'C'),
        choice('math', '下列图形中，既是轴对称图形又是中心对称图形的是______。', {'A': '等边三角形', 'B': '平行四边形', 'C': '正五边形', 'D': '圆'}, 'D'),
        choice('math', '若a<b，则下列不等式一定成立的是______。', {'A': 'a-3>b-3', 'B': '-2a<-2b', 'C': 'a/2<b/2', 'D': 'a²<b²'}, 'C'),
        choice('math', '正比例函数y=kx经过点(2, -4)，则k=______。', {'A': '2', 'B': '-2', 'C': '1/2', 'D': '-1/2'}, 'B'),
        choice('math', '一次函数y=3x-2的图像与y轴的交点坐标是______。', {'A': '(0, 2)', 'B': '(0, -2)', 'C': '(2, 0)', 'D': '(-2, 0)'}, 'B'),
        choice('math', '菱形具有而矩形不一定具有的性质是______。', {'A': '对边平行', 'B': '对角线互相平分', 'C': '对角线互相垂直', 'D': '对角相等'}, 'C'),
        choice('math', '若平行四边形ABCD中，∠A+∠C=200°，则∠B=______。', {'A': '60°', 'B': '80°', 'C': '100°', 'D': '120°'}, 'B'),
        choice('math', '关于x的方程x²-5x+m=0的一个根是2，则m=______。', {'A': '4', 'B': '6', 'C': '-6', 'D': '-4'}, 'B'),
        choice('math', '已知反比例函数y=k/x(k≠0)的图像经过点(-2, 3)，则k=______。', {'A': '6', 'B': '-6', 'C': '3/2', 'D': '-3/2'}, 'B'),
        choice('math', '已知扇形的圆心角为120°，半径为3，则扇形的面积为______。', {'A': 'π', 'B': '2π', 'C': '3π', 'D': '6π'}, 'C'),
        choice('math', '正六边形的每个外角为______。', {'A': '30°', 'B': '45°', 'C': '60°', 'D': '90°'}, 'C'),
        choice('math', '下列函数中，当x>0时，y随x增大而增大的是______。', {'A': 'y=-x', 'B': 'y=1/x', 'C': 'y=x²', 'D': 'y=-x²'}, 'C'),
    ]
    questions.extend(math_choice)

    math_fill = [
        fill('math', '计算：|-5|-3 = ______。', '2'),
        fill('math', '-2的相反数是______。', '2'),
        fill('math', '用科学记数法表示：52000 = ______。', '5.2×10⁴'),
        fill('math', '比较大小：-3 ______ -5。（填">""<"或"="）', '<'),
        fill('math', '计算：(-3)+(-7) = ______。', '-10'),
        fill('math', '若2x-3=5，则x=______。', '4'),
        fill('math', '化简：2a-3a+4a = ______。', '3a'),
        fill('math', '去括号：-(x-2y+3) = ______。', '-x+2y-3'),
        fill('math', '合并同类项：5x²-2x²+3x² = ______。', '6x²'),
        fill('math', '已知a与b互为倒数，则ab=______。', '1'),
        fill('math', '若|x-2|+(y+3)²=0，则x+y=______。', '-1'),
        fill('math', '多项式2x²-3x+1是______次______项式。', '二,三'),
        fill('math', '一个角是70°39\'，则它的余角是______。', "19°21'"),
        fill('math', '若a∥b，b∥c，则a______c。', '∥'),
        fill('math', '三角形两边长分别为3和7，则第三边的取值范围是______。', '4<x<10'),
        fill('math', '等腰三角形两边长为4和9，则周长为______。', '22'),
        fill('math', 'n边形的内角和公式为______。', '(n-2)×180°'),
        fill('math', '正八边形的每个外角为______°。', '45'),
        fill('math', '已知点A(-2, 3)关于y轴对称的点B的坐标是______。', '(2, 3)'),
        fill('math', '√16的算术平方根是______。', '2'),
        fill('math', '若分式(x-1)/(x+2)的值为0，则x=______。', '1'),
        fill('math', '分解因式：x²-4 = ______。', '(x+2)(x-2)'),
        fill('math', '分解因式：x²-6x+9 = ______。', '(x-3)²'),
        fill('math', '解方程：(x+1)(x-3)=0，则x₁=______，x₂=______。', '-1,3'),
        fill('math', '若方程x²+mx+9=0有两个相等实根，则m=______。', '±6'),
        fill('math', '二次函数y=x²-2x+3的最小值是______。', '2'),
        fill('math', '抛物线y=ax²+bx+c的对称轴公式是x=______。', '-b/2a'),
        fill('math', '在Rt△ABC中，∠C=90°，sinA=3/5，AB=10，则BC=______。', '6'),
        fill('math', 'tan45°=______。', '1'),
        fill('math', '半径为5的圆中，90°圆心角所对的扇形面积为______。', '25π/4'),
        fill('math', '圆锥的母线长为5，底面半径为3，则侧面积为______。', '15π'),
        fill('math', '数据2，3，3，4，6的中位数是______。', '3'),
        fill('math', '同时抛两枚硬币，一正一反的概率是______。', '1/2'),
        fill('math', '若△ABC∽△DEF，AB=4，DE=6，则相似比为______。', '2:3'),
        fill('math', '一次函数y=2x-5与x轴的交点坐标是______。', '(2.5, 0)'),
        fill('math', '函数y=√(x-1)中自变量x的取值范围是______。', 'x≥1'),
        fill('math', '若最简二次根式√(a+1)与√3是同类二次根式，则a=______。', '2'),
        fill('math', '如图，AB是⊙O的直径，∠AOC=50°，则∠B=______°。', '25'),
        fill('math', '一个样本的方差s²=1/5[(x₁-4)²+(x₂-4)²+…+(x₅-4)²]，则样本容量是______。', '5'),
        fill('math', '用反证法证明"三角形中至少有一个内角不大于60°"时，应先假设______。', '三个角都大于60°'),
        fill('math', '若a，b，c是△ABC的三边，化简|a-b-c|+|b-c-a|+|c-a-b|=______。', 'a+b+c'),
        fill('math', '已知(x-y+3)²+√(2x+y)=0，则x+y=______。', '1'),
        fill('math', '若ab<0，则化简√(a²b)=______。', '-a√b'),
        fill('math', '正比例函数y=kx中，k<0时，图像经过第______象限。', '二、四'),
        fill('math', '如图，在平行四边形ABCD中，∠A=130°，则∠C=______°。', '130'),
        fill('math', '抛物线y=x²-4x+3与x轴的两个交点坐标是______。', '(1, 0)和(3, 0)'),
        fill('math', '若直线y=kx+b与y=2x+1平行且过点(1, 3)，则k=______，b=______。', '2,1'),
        fill('math', '已知二次函数y=x²+2x-3，当x=______时，y取最小值，最小值为______。', '-1,-4'),
        fill('math', '一组数据x₁，x₂，...，xn的平均数是5，方差是3，则数据3x₁+2，3x₂+2，...，3xn+2的平均数是______。', '17'),
        fill('math', '菱形的两条对角线长分别为6和8，则菱形的边长为______，面积为______。', '5,24'),
        fill('math', 'AB是半圆O的直径，C是半圆上一点，∠ABC=30°，AB=10，则BC=______。', '5√3'),
        fill('math', '分解因式：a³-a = ______。', 'a(a+1)(a-1)'),
        fill('math', '若函数y=(m-1)x^{|m|}是正比例函数，则m=______。', '-1'),
        fill('math', '如图，在△ABC中，DE∥BC，AD=2，DB=4，△ADE面积=4，则△ABC面积=______。', '36'),
        fill('math', '小明掷一枚骰子，掷出偶数点的概率是______。', '1/2'),
        fill('math', '若x₁、x₂是方程x²-3x-4=0的两个根，则x₁+x₂=______，x₁x₂=______。', '3,-4'),
        fill('math', '如图所示，A、B是反比例函数y=6/x图像上两点，AC⊥y轴，BD⊥x轴，则S△OAC=______。', '3'),
        fill('math', '不等式3x-6<0的解集是______。', 'x<2'),
        fill('math', '把命题"对顶角相等"改写成"如果…那么…"的形式：______。', '如果两个角是对顶角，那么它们相等'),
        fill('math', '已知√(a-2)+|b+1|=0，则(a+b)²⁰²⁴=______。', '1'),
    ]
    questions.extend(math_fill)

    # ============================================================
    # 英语 (english) — 60 选择 + 60 填空
    # 初一：基础语法词汇；初二：时态/比较级/从句入门；
    # 初三：被动语态/定语从句/中考真题风格
    # ============================================================

    eng_choice = [
        # --- 初一 基础语法 ---
        choice('english', 'This is ______ apple. ______ apple is red.',
               {'A': 'a, The', 'B': 'an, The', 'C': 'a, A', 'D': 'an, A'}, 'B'),
        choice('english', '—______ is your name? —My name is Tom.',
               {'A': 'Who', 'B': 'What', 'C': 'Where', 'D': 'How'}, 'B'),
        choice('english', 'There ______ a book and two pens on the desk.',
               {'A': 'is', 'B': 'are', 'C': 'have', 'D': 'has'}, 'A'),
        choice('english', '—______ do you go to school? —By bus.',
               {'A': 'What', 'B': 'How', 'C': 'When', 'D': 'Where'}, 'B'),
        choice('english', 'My brother ______ playing football after school.',
               {'A': 'like', 'B': 'likes', 'C': 'liking', 'D': 'to like'}, 'B'),
        choice('english', 'There are ______ students in our class.',
               {'A': 'fourty', 'B': 'forty', 'C': 'fourty-five', 'D': 'forteen'}, 'B'),
        choice('english', '—Can you play ______ guitar? —Yes, I can.',
               {'A': 'a', 'B': 'an', 'C': 'the', 'D': '/'}, 'C'),
        choice('english', 'My father ______ TV every evening.',
               {'A': 'watch', 'B': 'watches', 'C': 'watching', 'D': 'is watching'}, 'B'),
        choice('english', 'Please ______ quiet in the library.',
               {'A': 'is', 'B': 'are', 'C': 'be', 'D': 'being'}, 'C'),
        choice('english', '—______ is it from your home to school? —About 2 kilometers.',
               {'A': 'How long', 'B': 'How far', 'C': 'How often', 'D': 'How much'}, 'B'),
        # --- 初一 代词与名词 ---
        choice('english', 'This is not ______ book. ______ is over there.',
               {'A': 'my, Mine', 'B': 'mine, My', 'C': 'my, My', 'D': 'mine, Mine'}, 'A'),
        choice('english', 'How many ______ can you see in the picture?',
               {'A': 'sheep', 'B': 'sheeps', 'C': 'sheeps', 'D': 'a sheep'}, 'A'),
        choice('english', '—Whose pencil is this? —It\'s ______.',
               {'A': 'he', 'B': 'him', 'C': 'his', 'D': 'he\'s'}, 'C'),
        choice('english', 'September is the ______ month of the year.',
               {'A': 'nine', 'B': 'ninth', 'C': 'nineth', 'D': 'nineteen'}, 'B'),
        choice('english', 'I have two ______.',
               {'A': 'knifes', 'B': 'knives', 'C': 'knife', 'D': 'knifs'}, 'B'),
        # --- 初二 时态 ---
        choice('english', 'I ______ my homework when my mother came back.',
               {'A': 'do', 'B': 'was doing', 'C': 'did', 'D': 'am doing'}, 'B'),
        choice('english', 'He ______ to Beijing three times.',
               {'A': 'has been', 'B': 'has gone', 'C': 'went', 'D': 'goes'}, 'A'),
        choice('english', 'We ______ a sports meeting next week.',
               {'A': 'have', 'B': 'will have', 'C': 'had', 'D': 'are having'}, 'B'),
        choice('english', 'The train ______ when I got to the station.',
               {'A': 'left', 'B': 'has left', 'C': 'had left', 'D': 'was leaving'}, 'C'),
        choice('english', 'She ______ English for five years.',
               {'A': 'learns', 'B': 'learned', 'C': 'is learning', 'D': 'has learned'}, 'D'),
        # --- 初二 比较级与最高级 ---
        choice('english', 'Tom is ______ than any other student in his class.',
               {'A': 'tall', 'B': 'taller', 'C': 'tallest', 'D': 'the tallest'}, 'B'),
        choice('english', 'The Yellow River is the second ______ river in China.',
               {'A': 'long', 'B': 'longer', 'C': 'longest', 'D': 'most long'}, 'C'),
        choice('english', 'The weather is getting ______ and ______.',
               {'A': 'warm, warm', 'B': 'warmer, warmer', 'C': 'warmest, warmest', 'D': 'more warm, more warm'}, 'B'),
        choice('english', '______ you work, ______ progress you will make.',
               {'A': 'The harder, the greater', 'B': 'Harder, greater', 'C': 'The hard, the great', 'D': 'Hard, great'}, 'A'),
        # --- 初二 情态动词 ---
        choice('english', '—Must I finish the work today? —No, you ______.',
               {'A': 'mustn\'t', 'B': 'needn\'t', 'C': 'can\'t', 'D': 'shouldn\'t'}, 'B'),
        choice('english', 'You ______ play football in the street. It\'s dangerous.',
               {'A': 'mustn\'t', 'B': 'needn\'t', 'C': 'couldn\'t', 'D': 'wouldn\'t'}, 'A'),
        # --- 初三 被动语态 ---
        choice('english', 'The bridge ______ last year.',
               {'A': 'built', 'B': 'was built', 'C': 'is built', 'D': 'has built'}, 'B'),
        choice('english', 'English ______ widely ______ all over the world.',
               {'A': 'is, spoken', 'B': 'is, speaking', 'C': 'has, spoken', 'D': 'was, speaking'}, 'A'),
        choice('english', 'A new hospital ______ in our city next year.',
               {'A': 'builds', 'B': 'will build', 'C': 'will be built', 'D': 'is build'}, 'C'),
        choice('english', 'The room ______ every day by the students.',
               {'A': 'cleans', 'B': 'is cleaned', 'C': 'cleaned', 'D': 'is cleaning'}, 'B'),
        # --- 初三 定语从句 ---
        choice('english', 'This is the best film ______ I have ever seen.',
               {'A': 'which', 'B': 'that', 'C': 'who', 'D': 'what'}, 'B'),
        choice('english', 'The man ______ is talking with my father is my teacher.',
               {'A': 'who', 'B': 'which', 'C': 'what', 'D': 'whom'}, 'A'),
        choice('english', 'I will never forget the day ______ we first met.',
               {'A': 'which', 'B': 'that', 'C': 'when', 'D': 'where'}, 'C'),
        choice('english', 'This is the factory ______ my father works.',
               {'A': 'that', 'B': 'which', 'C': 'where', 'D': 'when'}, 'C'),
        # --- 初三 宾语从句 ---
        choice('english', 'Can you tell me ______?',
               {'A': 'where does he live', 'B': 'where he lives', 'C': 'where he live', 'D': 'where did he live'}, 'B'),
        choice('english', 'She asked me ______ I had finished my homework.',
               {'A': 'that', 'B': 'what', 'C': 'if', 'D': 'which'}, 'C'),
        # --- 初三 中考真题风格 ---
        choice('english', '______ exciting news it is!',
               {'A': 'What', 'B': 'What an', 'C': 'How', 'D': 'How an'}, 'A'),
        choice('english', 'Neither Tom nor his parents ______ at home yesterday.',
               {'A': 'was', 'B': 'were', 'C': 'is', 'D': 'are'}, 'B'),
        choice('english', 'Not only my sister but also I ______ interested in music.',
               {'A': 'am', 'B': 'is', 'C': 'are', 'D': 'be'}, 'A'),
        choice('english', 'The number of the students in our school ______ 2000.',
               {'A': 'is', 'B': 'are', 'C': 'has', 'D': 'have'}, 'A'),
        choice('english', 'It\'s necessary for us ______ English well.',
               {'A': 'learn', 'B': 'learning', 'C': 'to learn', 'D': 'learned'}, 'C'),
        choice('english', 'I don\'t know if he ______ tomorrow. If he ______, I\'ll call you.',
               {'A': 'comes, comes', 'B': 'will come, comes', 'C': 'comes, will come', 'D': 'will come, will come'}, 'B'),
        choice('english', 'By the end of last year, we ______ over 2000 English words.',
               {'A': 'learned', 'B': 'have learned', 'C': 'had learned', 'D': 'were learning'}, 'C'),
        choice('english', 'The old man lives ______, but he doesn\'t feel ______.',
               {'A': 'alone, alone', 'B': 'lonely, lonely', 'C': 'alone, lonely', 'D': 'lonely, alone'}, 'C'),
        choice('english', '______ of the students in our class are girls.',
               {'A': 'Two three', 'B': 'Two third', 'C': 'Two thirds', 'D': 'Second three'}, 'C'),
        choice('english', 'She is ______ to go to school.',
               {'A': 'enough old', 'B': 'old enough', 'C': 'too old', 'D': 'so old'}, 'B'),
        choice('english', '—Would you like some coffee? —______.',
               {'A': 'Yes, I would', 'B': 'Yes, please', 'C': 'No, I wouldn\'t', 'D': 'Yes, I like'}, 'B'),
        choice('english', 'He prefers ______ at home to ______ out on weekends.',
               {'A': 'stay, go', 'B': 'staying, going', 'C': 'staying, go', 'D': 'stay, going'}, 'B'),
        choice('english', 'So far, the scientists ______ no signs of life on Mars.',
               {'A': 'find', 'B': 'found', 'C': 'have found', 'D': 'will find'}, 'C'),
        choice('english', 'You\'d better ______ too much time on computer games.',
               {'A': 'not spend', 'B': 'not to spend', 'C': 'not spending', 'D': "don't spend"}, 'A'),
        choice('english', '______ the teachers in our school is about 200.',
               {'A': 'A number of', 'B': 'The number of', 'C': 'A lot of', 'D': 'Many of'}, 'B'),
        choice('english', 'I wonder ______.',
               {'A': 'what\'s wrong with him', 'B': 'what wrong is with him', 'C': 'what the matter is', 'D': 'how is he'}, 'A'),
        choice('english', 'This kind of computer ______ made in China.',
               {'A': 'is', 'B': 'are', 'C': 'has', 'D': 'have'}, 'A'),
        choice('english', '—I passed the driving test! —______!',
               {'A': 'Congratulations', 'B': 'Good luck', 'C': 'That\'s all right', 'D': 'I\'m sorry'}, 'A'),
        choice('english', 'The ______ trees we plant, the ______ our environment will be.',
               {'A': 'more, better', 'B': 'most, best', 'C': 'more, good', 'D': 'many, well'}, 'A'),
        choice('english', 'This book ______ belong to Tom. His name is on the cover.',
               {'A': 'can', 'B': 'may', 'C': 'must', 'D': 'might'}, 'C'),
        choice('english', 'He asked ______.',
               {'A': 'where did I go', 'B': 'where I went', 'C': 'I went where', 'D': 'where I go'}, 'B'),
        choice('english', 'I used to ______ up late, but now I\'m used to ______ up early.',
               {'A': 'get, get', 'B': 'getting, getting', 'C': 'get, getting', 'D': 'getting, get'}, 'C'),
        choice('english', 'The movie ______ for ten minutes when we arrived.',
               {'A': 'had begun', 'B': 'had been on', 'C': 'has begun', 'D': 'has been on'}, 'B'),
        choice('english', 'It is very kind ______ you to help me with my English.',
               {'A': 'of', 'B': 'for', 'C': 'to', 'D': 'with'}, 'A'),
    ]
    questions.extend(eng_choice)

    eng_fill = [
        fill('english', 'I ______ (be) a student. My name ______ (be) Li Hua.', 'am, is'),
        fill('english', '______ (this) are my books.', 'These'),
        fill('english', 'My father ______ (not like) playing basketball.', 'doesn\'t like'),
        fill('english', 'There ______ (be) some water in the glass.', 'is'),
        fill('english', 'Let\'s ______ (go) shopping together.', 'go'),
        fill('english', 'Tom is good at ______ (swim).', 'swimming'),
        fill('english', 'It takes me 30 minutes ______ (get) to school every day.', 'to get'),
        fill('english', 'Look! The children ______ (fly) kites in the park.', 'are flying'),
        fill('english', 'He ______ (read) a book when I called him.', 'was reading'),
        fill('english', 'She ______ (be) to the Great Wall twice.', 'has been'),
        fill('english', 'My mother often tells me ______ (not play) computer games.', 'not to play'),
        fill('english', 'I don\'t know how ______ (solve) this problem.', 'to solve'),
        fill('english', 'Would you mind ______ (open) the window?', 'opening'),
        fill('english', 'He ran fast so that he could ______ (catch) the bus.', 'catch'),
        fill('english', 'The house ______ (build) in 1998.', 'was built'),
        fill('english', 'The flowers need ______ (water) every day.', 'watering'),
        fill('english', 'She is one of the best ______ (sing) in China.', 'singers'),
        fill('english', 'September 10th is ______ (teacher) Day.', "Teachers'"),
        fill('english', 'Help ______ (you) to some fish, children.', 'yourselves'),
        fill('english', 'This is not my bike. ______ (I) is over there.', 'Mine'),
        fill('english', 'The boy ______ (name) Jack is my best friend.', 'named'),
        fill('english', 'He was so ______ (excite) that he couldn\'t fall asleep.', 'excited'),
        fill('english', 'The story is very ______ (interest). All of us are ______ (interest) in it.', 'interesting, interested'),
        fill('english', 'We should try our best to protect the ______ (environment).', 'environment'),
        fill('english', 'It is ______ (possible) for humans to live without water.', 'impossible'),
        fill('english', 'The wind is blowing ______ (strong) outside.', 'strongly'),
        fill('english', 'He is ______ (tall) than any other boy in his class.', 'taller'),
        fill('english', 'Beijing is one of ______ (beautiful) cities in the world.', 'the most beautiful'),
        fill('english', 'I prefer ______ (stay) at home to going out.', 'staying'),
        fill('english', 'He\'d rather ______ (walk) than take a bus.', 'walk'),
        fill('english', 'I\'m looking forward to ______ (hear) from you.', 'hearing'),
        fill('english', 'We had no choice but ______ (wait).', 'to wait'),
        fill('english', 'She was heard ______ (sing) in the next room.', 'to sing'),
        fill('english', 'With the boy ______ (lead) the way, we found the house easily.', 'leading'),
        fill('english', 'The man ______ (stand) there is my uncle.', 'standing'),
        fill('english', '______ (not make) any noise. The baby is sleeping.', "Don't make"),
        fill('english', 'This is the school in ______ I studied three years ago.', 'which'),
        fill('english', 'She is such a kind girl ______ everyone likes her.', 'that'),
        fill('english', 'It is ______ fine weather that we all want to go out.', 'such'),
        fill('english', 'Neither he nor I ______ (be) wrong.', 'am'),
        fill('english', 'Not only the students but also the teacher ______ (like) the film.', 'likes'),
        fill('english', 'He didn\'t go to school yesterday because of his ______ (ill).', 'illness'),
        fill('english', '______ (luck), he passed the exam at last.', 'Luckily'),
        fill('english', 'Alan is from England. He is ______ (England).', 'English'),
        fill('english', 'More and more people realize the ______ (important) of education.', 'importance'),
        fill('english', 'It\'s ______ (danger) to swim alone in the river.', 'dangerous'),
        fill('english', 'The bridge ______ (connect) the two cities was built in 2010.', 'connecting'),
        fill('english', 'I spent two hours ______ (finish) my homework.', 'finishing'),
        fill('english', 'I have something important ______ (tell) you.', 'to tell'),
        fill('english', 'Would you like ______ (have) a cup of tea?', 'to have'),
        fill('english', 'The teacher made him ______ (clean) the classroom.', 'clean'),
        fill('english', 'Jim was made ______ (clean) the classroom by the teacher.', 'to clean'),
        fill('english', 'He won\'t go to the party unless he ______ (invite).', 'is invited'),
        fill('english', 'I will call you as soon as I ______ (arrive) in Beijing.', 'arrive'),
        fill('english', '______ (eat) too much is bad for your health.', 'Eating'),
        fill('english', 'It took us three hours ______ (climb) the mountain.', 'to climb'),
        fill('english', 'The number of students in our school ______ (be) about 2000.', 'is'),
        fill('english', 'A number of students ______ (be) playing on the playground.', 'are'),
        fill('english', 'She said that she ______ (go) to Shanghai the next day.', 'would go'),
        fill('english', 'The box is too heavy for me ______ (carry).', 'to carry'),
    ]
    questions.extend(eng_fill)

    # ============================================================
    # 物理 (physics) — 40 选择 + 40 填空 (初二+初三)
    # 初二：声光热/透镜/质量密度；初三：力与运动/压强浮力/电学
    # ============================================================

    phy_choice = [
        # --- 声现象 ---
        choice('physics', '声音是由物体的______产生的。', {'A': '运动', 'B': '振动', 'C': '碰撞', 'D': '摩擦'}, 'B'),
        choice('physics', '声音在下列介质中传播最快的是______。', {'A': '空气', 'B': '水', 'C': '钢铁', 'D': '真空'}, 'C'),
        choice('physics', '人耳能听到的声音频率范围是______。', {'A': '0~20Hz', 'B': '20~20000Hz', 'C': '>20000Hz', 'D': '任意频率'}, 'B'),
        choice('physics', '关于乐音的三个特征，下列说法正确的是______。', {'A': '音调与振幅有关', 'B': '响度与频率有关', 'C': '音色与发声体材料有关', 'D': '三者都与频率有关'}, 'C'),
        # --- 光现象 ---
        choice('physics', '下列现象中属于光的反射的是______。', {'A': '小孔成像', 'B': '水中倒影', 'C': '海市蜃楼', 'D': '雨后彩虹'}, 'B'),
        choice('physics', '光从空气斜射入水中时，折射角______入射角。', {'A': '大于', 'B': '等于', 'C': '小于', 'D': '无法判断'}, 'C'),
        choice('physics', '凸透镜的焦距为10cm，当物距为15cm时，成______。', {'A': '正立放大的虚像', 'B': '倒立放大的实像', 'C': '倒立缩小的实像', 'D': '倒立等大的实像'}, 'B'),
        choice('physics', '下列光学元件中，对光有发散作用的是______。', {'A': '凸透镜', 'B': '凹透镜', 'C': '平面镜', 'D': '凸面镜'}, 'B'),
        choice('physics', '近视眼应佩戴______透镜进行矫正。', {'A': '凸透镜', 'B': '凹透镜', 'C': '平面镜', 'D': '三棱镜'}, 'B'),
        # --- 热学 ---
        choice('physics', '下列属于液化现象的是______。', {'A': '冰雪消融', 'B': '湿衣服晾干', 'C': '冬天玻璃上的冰花', 'D': '夏天从冰箱取出的饮料瓶"出汗"'}, 'D'),
        choice('physics', '晶体熔化时______。', {'A': '温度升高，吸热', 'B': '温度不变，不吸热', 'C': '温度不变，吸热', 'D': '温度升高，不吸热'}, 'C'),
        choice('physics', '关于比热容，下列说法正确的是______。', {'A': '比热容与物体吸热多少有关', 'B': '比热容是物质的一种特性', 'C': '比热容与温度变化有关', 'D': '比热容与物体质量有关'}, 'B'),
        # --- 质量与密度 ---
        choice('physics', '一块质量为100g的冰熔化成水后，质量______。', {'A': '变大', 'B': '变小', 'C': '不变', 'D': '无法确定'}, 'C'),
        choice('physics', '一瓶氧气用掉一半后，瓶内氧气的密度______。', {'A': '不变', 'B': '变为原来的一半', 'C': '变为原来的两倍', 'D': '无法确定'}, 'B'),
        # --- 力与运动 ---
        choice('physics', '下列物体中，受到平衡力的是______。', {'A': '匀速转弯的汽车', 'B': '竖直上抛到最高点的小球', 'C': '匀速直线行驶的火车', 'D': '加速下落的苹果'}, 'C'),
        choice('physics', '关于惯性，下列说法正确的是______。', {'A': '物体速度越大惯性越大', 'B': '静止的物体没有惯性', 'C': '一切物体在任何时候都有惯性', 'D': '物体受力时惯性会改变'}, 'C'),
        choice('physics', '下列实例中，目的是为了增大压强的是______。', {'A': '书包带做得较宽', 'B': '铁轨铺在枕木上', 'C': '菜刀的刀刃磨得很薄', 'D': '坦克装有宽大的履带'}, 'C'),
        choice('physics', '关于大气压强，下列说法正确的是______。', {'A': '大气压随高度增加而增大', 'B': '大气压与天气无关', 'C': '马德堡半球实验证明了大气压的存在', 'D': '同一地点大气压固定不变'}, 'C'),
        # --- 浮力 ---
        choice('physics', '浸在水中的物体所受浮力的大小______。', {'A': '与物体密度有关', 'B': '与物体浸入的体积有关', 'C': '与物体的形状有关', 'D': '与物体的总重力有关'}, 'B'),
        choice('physics', '一个重为5N的木块漂浮在水面上，它受到的浮力是______。', {'A': '小于5N', 'B': '等于5N', 'C': '大于5N', 'D': '0N'}, 'B'),
        # --- 简单机械 ---
        choice('physics', '使用下列简单机械，一定不能省力的是______。', {'A': '动滑轮', 'B': '定滑轮', 'C': '斜面', 'D': '杠杆'}, 'B'),
        choice('physics', '下列工具中，属于费力杠杆的是______。', {'A': '核桃夹', 'B': '筷子', 'C': '撬棍', 'D': '瓶盖起子'}, 'B'),
        # --- 电学基础 ---
        choice('physics', '下列物质中，属于导体的是______。', {'A': '橡胶', 'B': '塑料', 'C': '石墨', 'D': '玻璃'}, 'C'),
        choice('physics', '关于电流、电压、电阻的关系，下列说法正确的是______。', {'A': '电压是形成电流的原因', 'B': '电阻越大，电流一定越小', 'C': '导体两端电压为零时，电阻也为零', 'D': '电流与电压一定成正比'}, 'A'),
        choice('physics', '两电阻R₁=10Ω、R₂=20Ω串联，总电阻是______。', {'A': '10Ω', 'B': '20Ω', 'C': '30Ω', 'D': '200Ω'}, 'C'),
        choice('physics', '两电阻R₁=6Ω、R₂=3Ω并联，总电阻是______。', {'A': '2Ω', 'B': '9Ω', 'C': '18Ω', 'D': '0.5Ω'}, 'A'),
        choice('physics', '下列用电器中，利用电流热效应工作的是______。', {'A': '电视机', 'B': '电风扇', 'C': '电饭锅', 'D': '洗衣机'}, 'C'),
        # --- 电功率 ---
        choice('physics', '"220V 100W"的灯泡正常工作时的电流约为______。', {'A': '0.22A', 'B': '0.45A', 'C': '2.2A', 'D': '4.5A'}, 'B'),
        choice('physics', '电能表是测量______的仪表。', {'A': '电流', 'B': '电压', 'C': '电功', 'D': '电功率'}, 'C'),
        # --- 电与磁 ---
        choice('physics', '奥斯特实验证明了______。', {'A': '电流周围存在磁场', 'B': '磁场对电流有力的作用', 'C': '电磁感应现象', 'D': '磁能生电'}, 'A'),
        choice('physics', '下列设备中，利用电磁感应原理工作的是______。', {'A': '电动机', 'B': '发电机', 'C': '电磁铁', 'D': '电铃'}, 'B'),
        choice('physics', '关于安全用电，下列说法正确的是______。', {'A': '用湿手拔电源插头', 'B': '更换灯泡时需断开电源', 'C': '在高压线附近放风筝', 'D': '用铜丝代替保险丝'}, 'B'),
        # --- 综合 ---
        choice('physics', '下列物理量中，以科学家"焦耳"的名字作为单位的是______。', {'A': '电流', 'B': '电压', 'C': '电功', 'D': '电功率'}, 'C'),
        choice('physics', '分子动理论的基本内容不包括______。', {'A': '物质由分子组成', 'B': '分子永不停息地做无规则运动', 'C': '分子间存在引力和斥力', 'D': '分子间没有间隙'}, 'D'),
        choice('physics', '下列能源中，属于可再生能源的是______。', {'A': '煤', 'B': '石油', 'C': '太阳能', 'D': '天然气'}, 'C'),
        choice('physics', '北斗导航卫星是通过______传递信息的。', {'A': '超声波', 'B': '次声波', 'C': '电磁波', 'D': '红外线'}, 'C'),
        choice('physics', '在"探究凸透镜成像规律"的实验中，当蜡烛到凸透镜的距离为20cm时，在光屏上得到一个倒立缩小的实像，则该凸透镜的焦距可能是______。', {'A': '5cm', 'B': '10cm', 'C': '15cm', 'D': '25cm'}, 'A'),
        choice('physics', '一辆小汽车在平直公路上匀速行驶时，牵引力为2000N，10秒内行驶200米，则牵引力做功为______。', {'A': '2×10³J', 'B': '2×10⁴J', 'C': '4×10⁴J', 'D': '4×10⁵J'}, 'D'),
        choice('physics', '将"6V 3W"和"6V 6W"的两只灯泡串联后接在12V电源上，下列说法正确的是______。', {'A': '两灯都能正常发光', 'B': '两灯都变暗', 'C': '"6V 3W"灯比正常亮', 'D': '"6V 6W"灯比正常亮'}, 'C'),
        choice('physics', '一名中学生的重力约为______。', {'A': '5N', 'B': '50N', 'C': '500N', 'D': '5000N'}, 'C'),
    ]
    questions.extend(phy_choice)

    phy_fill = [
        fill('physics', '声音在15℃空气中的传播速度约为______m/s。', '340'),
        fill('physics', '光在真空中的传播速度约为______m/s。', '3×10⁸'),
        fill('physics', '一朵花到平面镜的距离为2m，则花在镜中的像到镜面的距离为______m。', '2'),
        fill('physics', '一束光从空气斜射入水中，入射角为30°，折射角______30°（填"大于""小于"或"等于"）。', '小于'),
        fill('physics', '近视眼患者看不清远处的物体，是因为物体的像成在视网膜的______方（填"前"或"后"）。', '前'),
        fill('physics', '水的沸点在标准大气压下是______℃。', '100'),
        fill('physics', '物体的______是物体惯性大小的量度。', '质量'),
        fill('physics', '力的三要素是力的大小、方向和______。', '作用点'),
        fill('physics', '物体在月球上受到的重力约为地球上的______。', '1/6'),
        fill('physics', '静止在水平桌面上的书受到______力和______力的作用，这两个力是一对平衡力。', '重,支持'),
        fill('physics', '一个物体重100N，在水平面上做匀速直线运动，受到的摩擦力为20N，则水平拉力为______N。', '20'),
        fill('physics', '船闸是利用______原理工作的。', '连通器'),
        fill('physics', '大气压随海拔高度的增加而______（填"增大"或"减小"）。', '减小'),
        fill('physics', '阿基米德原理：浸在液体中的物体受到的浮力大小等于它排开的液体的______。', '重力'),
        fill('physics', '定滑轮实质上是一个______杠杆。', '等臂'),
        fill('physics', '动滑轮可以省______力，但不能改变力的方向。', '一半'),
        fill('physics', '在国际单位制中，电流的单位是______。', '安培(A)'),
        fill('physics', '一节新的干电池电压是______V。', '1.5'),
        fill('physics', '我国家庭电路的电压是______V。', '220'),
        fill('physics', '欧姆定律的公式是______。', 'I=U/R'),
        fill('physics', '电能表上标有"3000r/kWh"字样，转盘转600圈，用电器消耗的电能为______kWh。', '0.2'),
        fill('physics', '一个电阻两端的电压从2V增加到3V，通过它的电流变化了0.1A，则该电阻的阻值为______Ω。', '10'),
        fill('physics', '通电导体在磁场中受力的方向与______方向和______方向有关。', '电流,磁场'),
        fill('physics', '发电机的工作原理是______现象。', '电磁感应'),
        fill('physics', '核电站是利用核______（填"裂变"或"聚变"）发电的。', '裂变'),
        fill('physics', '影响蒸发快慢的因素有：液体温度、______和______。', '液体表面积,液体表面空气流速'),
        fill('physics', '热传递的方式有：传导、______和______。', '对流,辐射'),
        fill('physics', '某种燃料______放出的热量叫这种燃料的热值。', '完全燃烧'),
        fill('physics', '光的三原色是红、______、蓝。', '绿'),
        fill('physics', '在弹性限度内，弹簧的伸长量与所受拉力成______比。', '正'),
        fill('physics', '力的作用是______的。', '相互'),
        fill('physics', 'g=9.8N/kg的物理意义是______。', '质量为1kg的物体受到的重力为9.8N'),
        fill('physics', '功率是表示物体做功______的物理量。', '快慢'),
        fill('physics', '机械效率总小于______。', '1'),
        fill('physics', '物体动能的大小与物体的______和______有关。', '质量,速度'),
        fill('physics', '验电器是用来检验物体是否______的仪器。', '带电'),
        fill('physics', '电荷间的相互作用：同种电荷互相______，异种电荷互相______。', '排斥,吸引'),
        fill('physics', '滑动变阻器是通过改变接入电路中电阻丝的______来改变电阻的。', '长度'),
        fill('physics', '焦耳定律：电流通过导体产生的热量与______的平方、______和通电时间成正比。', '电流,电阻'),
        fill('physics', '磁体周围存在______，其基本性质是对放入其中的磁体产生磁力的作用。', '磁场'),
    ]
    questions.extend(phy_fill)

    # ============================================================
    # 化学 (chemistry) — 20 选择 + 20 填空 (初三)
    # 物质变化/空气氧气/水/碳和碳的氧化物/金属/溶液/酸碱盐
    # ============================================================

    chem_choice = [
        choice('chemistry', '下列变化中，属于化学变化的是______。', {'A': '石蜡熔化', 'B': '粮食酿酒', 'C': '玻璃破碎', 'D': '酒精挥发'}, 'B'),
        choice('chemistry', '空气成分中，体积分数约占21%的是______。', {'A': '氮气', 'B': '氧气', 'C': '二氧化碳', 'D': '稀有气体'}, 'B'),
        choice('chemistry', '下列物质中，属于纯净物的是______。', {'A': '洁净的空气', 'B': '食盐水', 'C': '冰水混合物', 'D': '石油'}, 'C'),
        choice('chemistry', '下列关于氧气的说法正确的是______。', {'A': '氧气能做燃料', 'B': '氧气能助燃', 'C': '氧气极易溶于水', 'D': '氧气的密度比空气小'}, 'B'),
        choice('chemistry', '实验室用高锰酸钾制取氧气，应在试管口放一团棉花，其作用是______。', {'A': '加快反应速率', 'B': '防止高锰酸钾粉末进入导管', 'C': '增加氧气产量', 'D': '防止试管破裂'}, 'B'),
        choice('chemistry', '下列物质在氧气中燃烧，产生大量白烟的是______。', {'A': '木炭', 'B': '硫', 'C': '铁丝', 'D': '红磷'}, 'D'),
        choice('chemistry', '下列微粒中，能表示2个氢分子的是______。', {'A': '2H', 'B': 'H₂', 'C': '2H₂', 'D': '2H⁺'}, 'C'),
        choice('chemistry', '保持二氧化碳化学性质的最小微粒是______。', {'A': '碳原子', 'B': '氧原子', 'C': '二氧化碳分子', 'D': '碳原子和氧原子'}, 'C'),
        choice('chemistry', '碳单质中，硬度最大的是______。', {'A': '金刚石', 'B': '石墨', 'C': 'C₆₀', 'D': '活性炭'}, 'A'),
        choice('chemistry', '检验二氧化碳的方法是______。', {'A': '用燃着的木条', 'B': '通入澄清石灰水', 'C': '通入水中', 'D': '闻气味'}, 'B'),
        choice('chemistry', '下列金属活动性最强的是______。', {'A': 'Fe', 'B': 'Cu', 'C': 'Zn', 'D': 'Mg'}, 'D'),
        choice('chemistry', '将一根洁净的铁钉放入硫酸铜溶液中，可观察到的现象是______。', {'A': '溶液变蓝，铁钉表面有气泡', 'B': '铁钉表面有红色物质析出，溶液变浅绿色', 'C': '铁钉溶解，溶液变无色', 'D': '无现象'}, 'B'),
        choice('chemistry', '下列物质溶于水，溶液温度明显降低的是______。', {'A': 'NaCl', 'B': 'NaOH', 'C': 'NH₄NO₃', 'D': '浓H₂SO₄'}, 'C'),
        choice('chemistry', '溶液的pH<7，则该溶液______。', {'A': '一定呈酸性', 'B': '一定呈碱性', 'C': '一定呈中性', 'D': '无法判断'}, 'A'),
        choice('chemistry', '下列物质中，属于碱的是______。', {'A': 'NaCl', 'B': 'NaOH', 'C': 'HCl', 'D': 'Na₂SO₄'}, 'B'),
        choice('chemistry', '中和反应的实质是______。', {'A': 'H⁺+OH⁻=H₂O', 'B': '酸+碱=盐+水', 'C': 'Na⁺+Cl⁻=NaCl', 'D': 'H₂O=H⁺+OH⁻'}, 'A'),
        choice('chemistry', '下列物品使用的材料，属于有机合成材料的是______。', {'A': '羊毛衫', 'B': '纯棉毛巾', 'C': '塑料袋', 'D': '陶瓷碗'}, 'C'),
        choice('chemistry', '人体中含量最多的金属元素是______。', {'A': 'Fe', 'B': 'Ca', 'C': 'Na', 'D': 'K'}, 'B'),
        choice('chemistry', '为延缓食品变质，包装袋中常充入的气体是______。', {'A': 'O₂', 'B': 'N₂', 'C': 'CO₂', 'D': 'H₂'}, 'B'),
        choice('chemistry', '下列关于燃烧与灭火的说法不正确的是______。', {'A': '可燃物与氧气接触就能燃烧', 'B': '油锅着火用锅盖盖灭是隔绝氧气', 'C': '森林着火砍出隔离带是清除可燃物', 'D': '吹灭蜡烛是降低温度至着火点以下'}, 'A'),
    ]
    questions.extend(chem_choice)

    chem_fill = [
        fill('chemistry', '空气中含量最多的气体是______。', '氮气(N₂)'),
        fill('chemistry', '水的化学式为______。', 'H₂O'),
        fill('chemistry', '电解水实验中，正极产生的气体是______，负极产生的气体是______。', '氧气,氢气'),
        fill('chemistry', '原子的结构是由______和核外电子组成的，原子核由质子和______组成。', '原子核,中子'),
        fill('chemistry', '元素周期表中，原子序数=______=______=______。', '质子数,核电荷数,核外电子数'),
        fill('chemistry', '化合价是元素在形成化合物时表现出的一种性质，单质中元素的化合价为______。', '0'),
        fill('chemistry', 'CO₂中碳元素的化合价为______。', '+4'),
        fill('chemistry', '化学反应前后，______不变，______不变，______不变。', '原子种类,原子数目,原子质量'),
        fill('chemistry', '碳充分燃烧的化学方程式：______。', 'C+O₂=(CO₂)=CO₂(点燃)'),
        fill('chemistry', '一氧化碳还原氧化铁的化学方程式：______。', '3CO+Fe₂O₃=2Fe+3CO₂(高温)'),
        fill('chemistry', '铁生锈是铁与空气中的______和______共同作用的结果。', '氧气,水'),
        fill('chemistry', '防止铁生锈的方法有：______、______等（写出两个）。', '涂油,刷漆（合理即可）'),
        fill('chemistry', '溶液由______和______组成。', '溶质,溶剂'),
        fill('chemistry', '固体物质的溶解度通常是指在一定______下，某固体物质在______g溶剂里达到______状态时溶解的质量。', '温度,100,饱和'),
        fill('chemistry', '浓硫酸溶于水时会______大量热（填"放出"或"吸收"）。', '放出'),
        fill('chemistry', '盐酸的化学式是______。', 'HCl'),
        fill('chemistry', '稀盐酸与氢氧化钠反应的化学方程式：______。', 'HCl+NaOH=NaCl+H₂O'),
        fill('chemistry', '用pH试纸测定溶液的pH时，不能将pH试纸______（填"润湿"或"不润湿"），否则会影响测定结果。', '润湿'),
        fill('chemistry', '常见的复合肥是指同时含有______两种或两种以上营养元素的化肥（写出化学符号）。', 'N、P、K'),
        fill('chemistry', '三大有机合成材料是：______、______、______。', '塑料,合成纤维,合成橡胶'),
    ]
    questions.extend(chem_fill)

    return questions


def main():
    questions = get_questions()
    print(f"Total questions generated: {len(questions)}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()

    # 清空旧数据
    c.execute('DELETE FROM question_bank')
    print("Cleared existing question_bank data.")

    # 批量插入
    sql = 'INSERT INTO question_bank (subject, type, content, options, correct_answer) VALUES (?, ?, ?, ?, ?)'
    c.executemany(sql, questions)
    conn.commit()

    # 统计
    c.execute('SELECT subject, type, COUNT(*) FROM question_bank GROUP BY subject, type ORDER BY subject, type')
    rows = c.fetchall()
    print("\n=== Question Bank Summary ===")
    for subj, typ, cnt in rows:
        print(f"  {subj:12s} {typ:6s}: {cnt:3d}")
    c.execute('SELECT COUNT(*) FROM question_bank')
    total = c.fetchone()[0]
    print(f"\n  TOTAL: {total} questions")
    conn.close()
    print("\nDone!")


if __name__ == '__main__':
    main()
