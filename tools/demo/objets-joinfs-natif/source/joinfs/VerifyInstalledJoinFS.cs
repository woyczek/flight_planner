using System;using System.IO;using System.Linq;using System.Reflection;using System.Collections;
class VerifyJoinFS {
 const BindingFlags Instance=BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Instance;
 static bool HasFrames(Type t){return t.GetFields(Instance).Any(f=>f.FieldType.IsGenericType&&f.FieldType.GetGenericTypeDefinition()==typeof(System.Collections.Generic.List<>));}
 static MethodInfo Read(Type t){return t.GetMethods(Instance|BindingFlags.DeclaredOnly).FirstOrDefault(m=>{var p=m.GetParameters();return !m.IsStatic&&m.ReturnType==typeof(void)&&p.Length==2&&p[0].ParameterType==typeof(short)&&p[1].ParameterType==typeof(BinaryReader);});}
 static int Main(string[] args){try{
  var a=Assembly.LoadFrom(args[0]);var types=a.GetTypes();
  foreach(var t in types)foreach(var f in t.GetFields(BindingFlags.Public|BindingFlags.NonPublic|BindingFlags.Static))if(f.IsLiteral&&f.FieldType==typeof(short)){var n=(short)f.GetRawConstantValue();if(n>10000&&n<32000)Console.WriteLine("Int16 format/protocol constant: "+n);}
  var candidates=types.Where(t=>t.IsClass&&HasFrames(t)&&Read(t)!=null&&t.GetConstructor(Instance,null,Type.EmptyTypes,null)!=null).ToArray();
  Console.WriteLine("Parser object candidates: "+candidates.Length);
  if(args.Length<2)return 0;if(candidates.Length!=2)throw new Exception("Unexpected installed parser layout; no invocation attempted");
  var plain=candidates.First(t=>!candidates.Contains(t.BaseType));var aircraft=candidates.First(t=>t.BaseType==plain);
  using(var r=new BinaryReader(File.OpenRead(args[1]))){var version=r.ReadInt16();Console.WriteLine("Input VERSION="+version);
   foreach(var type in new[]{aircraft,plain}){var count=r.ReadInt32();if(count<0||count>32)throw new Exception("Invalid track count");for(int i=0;i<count;i++){
    var item=Activator.CreateInstance(type,true);Read(type).Invoke(item,new object[]{version,r});
    var field=type.GetFields(Instance).First(f=>f.FieldType.IsGenericType&&f.FieldType.GetGenericTypeDefinition()==typeof(System.Collections.Generic.List<>));
    Console.WriteLine((type==aircraft?"Aircraft":"Object")+": "+((ICollection)field.GetValue(item)).Count+" frames read by installed JoinFS");
   }}
   if(r.BaseStream.Position!=r.BaseStream.Length)throw new Exception("Trailing bytes: "+(r.BaseStream.Length-r.BaseStream.Position));
  }Console.WriteLine("PASS: installed parser reached exact end");return 0;
 }catch(Exception e){Console.Error.WriteLine(e.ToString());return 1;}}
}
