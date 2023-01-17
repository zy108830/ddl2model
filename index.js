/* code here... */

function getModelName(tableName){
    return tableName.charAt(0).toUpperCase()
        +tableName.substring(1).replace(/_([a-z])/g, function (g) {
        return g[1].toUpperCase(); });
}

function castDBType(type){
    if(type.indexOf('int')>-1){
        return "int";
    }else if(type=='decimal' || type=='float'){
        return 'float'
    }
    return "string"
}

var defaultDDL="CREATE TABLE `logo` (\n" +
    "  `id` int(11) NOT NULL AUTO_INCREMENT,\n" +
    "  `name` varchar(255) CHARACTER SET utf8mb4 DEFAULT '' COMMENT '名称',\n" +
    "  `default` tinyint(3) DEFAULT '0' COMMENT '是否为默认图标',\n" +
    "  `needcoin` tinyint(3) DEFAULT '0' COMMENT '是否收费',\n" +
    "  `index` tinyint(3) DEFAULT '0' COMMENT '排序',\n" +
    "  `created_at` int(11) DEFAULT '0',\n" +
    "  `updated_at` int(11) DEFAULT '0',\n" +
    "  PRIMARY KEY (`id`) USING BTREE\n" +
    ") ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8 ROW_FORMAT=COMPACT COMMENT='自定义Logo';"

document.getElementById('run').addEventListener('click',function (){
    let ddl=document.getElementById('coding').value || defaultDDL;
    let dateFormat="Y-m-d H:i:s";
    let tableComment="";
    let tableName=/TABLE `(.*)`/.exec(ddl)[1]
    let modelName=getModelName(tableName)
    let primaryKey=/PRIMARY KEY \(`(.*)`\)/.exec(ddl)[1]
    let fillable=[]
    let casts=[]

    let lines=ddl.split("\n")
    for (let i = 0; i < lines.length; i++) {
        let line=lines[i]
        if(/CREATE\sTABLE/.test(line)){
            // console.log("表头",line)
        }else if(/ENGINE=/.test(line)){
            let tableCommentMatch=/COMMENT='(.*)'/.exec(line)
            if(tableCommentMatch){
                tableComment=`// ${tableCommentMatch[1]}`
            }
            // console.log("表尾",line,tableComment)
        }else if(/PRIMARY\sKEY/.test(line)){
            // console.log("主键")
        }else {
            if(/created_at|updated_at/.test(line)){
                let items=/`\s(.*?)\s/.exec(line);
                if(items[1]=='timestamp'){
                    dateFormat="U";
                }
            }else {
                let items=/`(.*)`\s(.*)\(/.exec(line)
                let field_name=items[1]
                // 主键不需要处理
                if(field_name==primaryKey){
                    continue
                }
                // cast
                let field_type=castDBType(items[2])
                if(field_type!='string'){
                    casts.push(`"${field_name}"=>"${field_type}",`)
                }
                // fillable
                let field_comment=/COMMENT\s'(.*)'/.exec(line)
                try {
                    let field_default_value=/DEFAULT\s(.*?)(\s|\,)/.exec(line)[1] || `""`;
                    if(field_comment){
                        fillable.push(`'${field_name}', // ${field_comment[1]}；默认值 ${field_default_value}`)
                    }else {
                        fillable.push(`'${field_name}', // 默认值 ${field_default_value} `)
                    }
                }catch (e){
                    console.log(line)
                }

            }
        }
    }

    fillable=fillable.join("\n\t\t")
    casts=casts.join("\n\t\t")

    var result=`
<?php
namespace App\\Model;
use Illuminate\\Database\\Eloquent\\Model;
${tableComment}  
class ${modelName} extends Model{
\tprotected $connection='';
\tprotected $table='${tableName}';
\tprotected $primaryKey='${primaryKey}';
\tpublic $dateFormat='U';
\tprotected $fillable=[
\t\t${fillable}
\t];
\tprotected $casts=[
\t\t${casts}
\t];
}`
    result=result.replace(/>/g,'&gt')
    result=result.replace(/</g,'&lt')
    document.getElementById('result').innerHTML=result
    hljs.configure({tabReplace: ''});
    hljs.highlightAll();
})

document.addEventListener("DOMContentLoaded", function(event) {
    document.getElementById('coding').setAttribute('placeholder',defaultDDL)
    let clipboard=new ClipboardJS('.btn-copy');
    clipboard.on('success', function(e) {
        document.getElementById('toast').style.animation="spin1 0.6s linear";
        e.clearSelection();
        setTimeout(function (){
            document.getElementById('toast').style.animation=""
        },600)
    });
    clipboard.on('error', function(e) {
        console.log(e)
        console.error('Action:', e.action);
        console.error('Trigger:', e.trigger);
    });
});