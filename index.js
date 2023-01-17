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

var defaultDDL="CREATE TABLE `slow_log` (\n" +
    "  `start_time` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),\n" +
    "  `user_host` mediumtext NOT NULL,\n" +
    "  `query_time` time(6) NOT NULL,\n" +
    "  `lock_time` time(6) NOT NULL,\n" +
    "  `rows_sent` int(11) NOT NULL,\n" +
    "  `rows_examined` int(11) NOT NULL,\n" +
    "  `db` varchar(512) NOT NULL,\n" +
    "  `last_insert_id` int(11) NOT NULL,\n" +
    "  `insert_id` int(11) NOT NULL,\n" +
    "  `server_id` int(10) unsigned NOT NULL,\n" +
    "  `sql_text` mediumtext NOT NULL,\n" +
    "  `thread_id` bigint(21) unsigned NOT NULL\n" +
    ") ENGINE=CSV DEFAULT CHARSET=utf8 COMMENT='Slow log';"

document.getElementById('run').addEventListener('click',function (){
    let ddl=document.getElementById('coding').value || defaultDDL;
    let dateFormat="Y-m-d H:i:s";
    let tableComment="";
    let tableName=/TABLE `(.*)`/.exec(ddl)[1]
    let modelName=getModelName(tableName)
    let primaryKey=""
    let primaryKeyMatch=/PRIMARY KEY \(`(.*)`\)/.exec(ddl)
    if(primaryKeyMatch){
        primaryKey=primaryKeyMatch[1]
    }
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
                let items=/`(.*)`\s(.*)(\s|\()/.exec(line)
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
                /**
                 * fillable
                  */
                //comment
                let remark=""
                let field_comment_match=/COMMENT\s'(.*)'/.exec(line)
                if(field_comment_match){
                    remark+=`${field_comment_match[1]};`
                }
                // default value
                let field_default_value_match=/DEFAULT\s(.*?)(\s|\,)/.exec(line);
                if(field_default_value_match){
                    remark+=`default ${field_default_value_match[1]}`
                }
                if(remark){
                    remark=`, // `+remark
                }
                fillable.push(`'${field_name}'${remark}`)
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