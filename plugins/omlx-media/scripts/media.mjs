#!/usr/bin/env node
import { createRequire } from "node:module"; const require = createRequire(import.meta.url);
var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// plugins/omlx-media/src/media.ts
import { readFile as readFile3 } from "node:fs/promises";

// node_modules/@sinclair/typebox/build/esm/value/guard/guard.mjs
function IsAsyncIterator(value2) {
  return IsObject(value2) && globalThis.Symbol.asyncIterator in value2;
}
function IsIterator(value2) {
  return IsObject(value2) && globalThis.Symbol.iterator in value2;
}
function IsStandardObject(value2) {
  return IsObject(value2) && (globalThis.Object.getPrototypeOf(value2) === Object.prototype || globalThis.Object.getPrototypeOf(value2) === null);
}
function IsPromise(value2) {
  return value2 instanceof globalThis.Promise;
}
function IsDate(value2) {
  return value2 instanceof Date && globalThis.Number.isFinite(value2.getTime());
}
function IsMap(value2) {
  return value2 instanceof globalThis.Map;
}
function IsSet(value2) {
  return value2 instanceof globalThis.Set;
}
function IsTypedArray(value2) {
  return globalThis.ArrayBuffer.isView(value2);
}
function IsUint8Array(value2) {
  return value2 instanceof globalThis.Uint8Array;
}
function HasPropertyKey(value2, key) {
  return key in value2;
}
function IsObject(value2) {
  return value2 !== null && typeof value2 === "object";
}
function IsArray(value2) {
  return globalThis.Array.isArray(value2) && !globalThis.ArrayBuffer.isView(value2);
}
function IsUndefined(value2) {
  return value2 === void 0;
}
function IsNull(value2) {
  return value2 === null;
}
function IsBoolean(value2) {
  return typeof value2 === "boolean";
}
function IsNumber(value2) {
  return typeof value2 === "number";
}
function IsInteger(value2) {
  return globalThis.Number.isInteger(value2);
}
function IsBigInt(value2) {
  return typeof value2 === "bigint";
}
function IsString(value2) {
  return typeof value2 === "string";
}
function IsFunction(value2) {
  return typeof value2 === "function";
}
function IsSymbol(value2) {
  return typeof value2 === "symbol";
}
function IsValueType(value2) {
  return IsBigInt(value2) || IsBoolean(value2) || IsNull(value2) || IsNumber(value2) || IsString(value2) || IsSymbol(value2) || IsUndefined(value2);
}

// node_modules/@sinclair/typebox/build/esm/system/policy.mjs
var TypeSystemPolicy;
(function(TypeSystemPolicy2) {
  TypeSystemPolicy2.InstanceMode = "default";
  TypeSystemPolicy2.ExactOptionalPropertyTypes = false;
  TypeSystemPolicy2.AllowArrayObject = false;
  TypeSystemPolicy2.AllowNaN = false;
  TypeSystemPolicy2.AllowNullVoid = false;
  function IsExactOptionalProperty(value2, key) {
    return TypeSystemPolicy2.ExactOptionalPropertyTypes ? key in value2 : value2[key] !== void 0;
  }
  TypeSystemPolicy2.IsExactOptionalProperty = IsExactOptionalProperty;
  function IsObjectLike(value2) {
    const isObject = IsObject(value2);
    return TypeSystemPolicy2.AllowArrayObject ? isObject : isObject && !IsArray(value2);
  }
  TypeSystemPolicy2.IsObjectLike = IsObjectLike;
  function IsRecordLike(value2) {
    return IsObjectLike(value2) && !(value2 instanceof Date) && !(value2 instanceof Uint8Array);
  }
  TypeSystemPolicy2.IsRecordLike = IsRecordLike;
  function IsNumberLike(value2) {
    return TypeSystemPolicy2.AllowNaN ? IsNumber(value2) : Number.isFinite(value2);
  }
  TypeSystemPolicy2.IsNumberLike = IsNumberLike;
  function IsVoidLike(value2) {
    const isUndefined = IsUndefined(value2);
    return TypeSystemPolicy2.AllowNullVoid ? isUndefined || value2 === null : isUndefined;
  }
  TypeSystemPolicy2.IsVoidLike = IsVoidLike;
})(TypeSystemPolicy || (TypeSystemPolicy = {}));

// node_modules/@sinclair/typebox/build/esm/type/registry/format.mjs
var format_exports = {};
__export(format_exports, {
  Clear: () => Clear,
  Delete: () => Delete,
  Entries: () => Entries,
  Get: () => Get,
  Has: () => Has,
  Set: () => Set2
});
var map = /* @__PURE__ */ new Map();
function Entries() {
  return new Map(map);
}
function Clear() {
  return map.clear();
}
function Delete(format) {
  return map.delete(format);
}
function Has(format) {
  return map.has(format);
}
function Set2(format, func) {
  map.set(format, func);
}
function Get(format) {
  return map.get(format);
}

// node_modules/@sinclair/typebox/build/esm/type/registry/type.mjs
var type_exports = {};
__export(type_exports, {
  Clear: () => Clear2,
  Delete: () => Delete2,
  Entries: () => Entries2,
  Get: () => Get2,
  Has: () => Has2,
  Set: () => Set3
});
var map2 = /* @__PURE__ */ new Map();
function Entries2() {
  return new Map(map2);
}
function Clear2() {
  return map2.clear();
}
function Delete2(kind) {
  return map2.delete(kind);
}
function Has2(kind) {
  return map2.has(kind);
}
function Set3(kind, func) {
  map2.set(kind, func);
}
function Get2(kind) {
  return map2.get(kind);
}

// node_modules/@sinclair/typebox/build/esm/type/guard/value.mjs
var value_exports = {};
__export(value_exports, {
  HasPropertyKey: () => HasPropertyKey2,
  IsArray: () => IsArray2,
  IsAsyncIterator: () => IsAsyncIterator2,
  IsBigInt: () => IsBigInt2,
  IsBoolean: () => IsBoolean2,
  IsDate: () => IsDate2,
  IsFunction: () => IsFunction2,
  IsIterator: () => IsIterator2,
  IsNull: () => IsNull2,
  IsNumber: () => IsNumber2,
  IsObject: () => IsObject2,
  IsRegExp: () => IsRegExp,
  IsString: () => IsString2,
  IsSymbol: () => IsSymbol2,
  IsUint8Array: () => IsUint8Array2,
  IsUndefined: () => IsUndefined2
});
function HasPropertyKey2(value2, key) {
  return key in value2;
}
function IsAsyncIterator2(value2) {
  return IsObject2(value2) && !IsArray2(value2) && !IsUint8Array2(value2) && Symbol.asyncIterator in value2;
}
function IsArray2(value2) {
  return Array.isArray(value2);
}
function IsBigInt2(value2) {
  return typeof value2 === "bigint";
}
function IsBoolean2(value2) {
  return typeof value2 === "boolean";
}
function IsDate2(value2) {
  return value2 instanceof globalThis.Date;
}
function IsFunction2(value2) {
  return typeof value2 === "function";
}
function IsIterator2(value2) {
  return IsObject2(value2) && !IsArray2(value2) && !IsUint8Array2(value2) && Symbol.iterator in value2;
}
function IsNull2(value2) {
  return value2 === null;
}
function IsNumber2(value2) {
  return typeof value2 === "number";
}
function IsObject2(value2) {
  return typeof value2 === "object" && value2 !== null;
}
function IsRegExp(value2) {
  return value2 instanceof globalThis.RegExp;
}
function IsString2(value2) {
  return typeof value2 === "string";
}
function IsSymbol2(value2) {
  return typeof value2 === "symbol";
}
function IsUint8Array2(value2) {
  return value2 instanceof globalThis.Uint8Array;
}
function IsUndefined2(value2) {
  return value2 === void 0;
}

// node_modules/@sinclair/typebox/build/esm/type/create/immutable.mjs
function ImmutableArray(value2) {
  return globalThis.Object.freeze(value2).map((value3) => Immutable(value3));
}
function ImmutableDate(value2) {
  return value2;
}
function ImmutableUint8Array(value2) {
  return value2;
}
function ImmutableRegExp(value2) {
  return value2;
}
function ImmutableObject(value2) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(value2)) {
    result[key] = Immutable(value2[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value2)) {
    result[key] = Immutable(value2[key]);
  }
  return globalThis.Object.freeze(result);
}
function Immutable(value2) {
  return IsArray2(value2) ? ImmutableArray(value2) : IsDate2(value2) ? ImmutableDate(value2) : IsUint8Array2(value2) ? ImmutableUint8Array(value2) : IsRegExp(value2) ? ImmutableRegExp(value2) : IsObject2(value2) ? ImmutableObject(value2) : value2;
}

// node_modules/@sinclair/typebox/build/esm/type/clone/value.mjs
function ArrayType(value2) {
  return value2.map((value3) => Visit(value3));
}
function DateType(value2) {
  return new Date(value2.getTime());
}
function Uint8ArrayType(value2) {
  return new Uint8Array(value2);
}
function RegExpType(value2) {
  return new RegExp(value2.source, value2.flags);
}
function ObjectType(value2) {
  const result = {};
  for (const key of Object.getOwnPropertyNames(value2)) {
    result[key] = Visit(value2[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value2)) {
    result[key] = Visit(value2[key]);
  }
  return result;
}
function Visit(value2) {
  return IsArray2(value2) ? ArrayType(value2) : IsDate2(value2) ? DateType(value2) : IsUint8Array2(value2) ? Uint8ArrayType(value2) : IsRegExp(value2) ? RegExpType(value2) : IsObject2(value2) ? ObjectType(value2) : value2;
}
function Clone(value2) {
  return Visit(value2);
}

// node_modules/@sinclair/typebox/build/esm/type/create/type.mjs
function CreateType(schema, options) {
  const result = options !== void 0 ? { ...options, ...schema } : schema;
  switch (TypeSystemPolicy.InstanceMode) {
    case "freeze":
      return Immutable(result);
    case "clone":
      return Clone(result);
    default:
      return result;
  }
}

// node_modules/@sinclair/typebox/build/esm/type/symbols/symbols.mjs
var TransformKind = Symbol.for("TypeBox.Transform");
var ReadonlyKind = Symbol.for("TypeBox.Readonly");
var OptionalKind = Symbol.for("TypeBox.Optional");
var Hint = Symbol.for("TypeBox.Hint");
var Kind = Symbol.for("TypeBox.Kind");

// node_modules/@sinclair/typebox/build/esm/type/unsafe/unsafe.mjs
function Unsafe(options = {}) {
  return CreateType({ [Kind]: options[Kind] ?? "Unsafe" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/error/error.mjs
var TypeBoxError = class extends Error {
  constructor(message) {
    super(message);
  }
};

// node_modules/@sinclair/typebox/build/esm/type/mapped/mapped-result.mjs
function MappedResult(properties) {
  return CreateType({
    [Kind]: "MappedResult",
    properties
  });
}

// node_modules/@sinclair/typebox/build/esm/type/discard/discard.mjs
function DiscardKey(value2, key) {
  const { [key]: _, ...rest } = value2;
  return rest;
}
function Discard(value2, keys) {
  return keys.reduce((acc, key) => DiscardKey(acc, key), value2);
}

// node_modules/@sinclair/typebox/build/esm/type/array/array.mjs
function Array2(items, options) {
  return CreateType({ [Kind]: "Array", type: "array", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/async-iterator/async-iterator.mjs
function AsyncIterator(items, options) {
  return CreateType({ [Kind]: "AsyncIterator", type: "AsyncIterator", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/constructor/constructor.mjs
function Constructor(parameters, returns, options) {
  return CreateType({ [Kind]: "Constructor", type: "Constructor", parameters, returns }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/function/function.mjs
function Function(parameters, returns, options) {
  return CreateType({ [Kind]: "Function", type: "Function", parameters, returns }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/computed/computed.mjs
function Computed(target, parameters, options) {
  return CreateType({ [Kind]: "Computed", target, parameters }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/never/never.mjs
function Never(options) {
  return CreateType({ [Kind]: "Never", not: {} }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/guard/kind.mjs
function IsReadonly(value2) {
  return IsObject2(value2) && value2[ReadonlyKind] === "Readonly";
}
function IsOptional(value2) {
  return IsObject2(value2) && value2[OptionalKind] === "Optional";
}
function IsAny(value2) {
  return IsKindOf(value2, "Any");
}
function IsArgument(value2) {
  return IsKindOf(value2, "Argument");
}
function IsArray3(value2) {
  return IsKindOf(value2, "Array");
}
function IsAsyncIterator3(value2) {
  return IsKindOf(value2, "AsyncIterator");
}
function IsBigInt3(value2) {
  return IsKindOf(value2, "BigInt");
}
function IsBoolean3(value2) {
  return IsKindOf(value2, "Boolean");
}
function IsComputed(value2) {
  return IsKindOf(value2, "Computed");
}
function IsConstructor(value2) {
  return IsKindOf(value2, "Constructor");
}
function IsDate3(value2) {
  return IsKindOf(value2, "Date");
}
function IsFunction3(value2) {
  return IsKindOf(value2, "Function");
}
function IsInteger2(value2) {
  return IsKindOf(value2, "Integer");
}
function IsIntersect(value2) {
  return IsKindOf(value2, "Intersect");
}
function IsIterator3(value2) {
  return IsKindOf(value2, "Iterator");
}
function IsKindOf(value2, kind) {
  return IsObject2(value2) && Kind in value2 && value2[Kind] === kind;
}
function IsLiteralValue(value2) {
  return IsBoolean2(value2) || IsNumber2(value2) || IsString2(value2);
}
function IsLiteral(value2) {
  return IsKindOf(value2, "Literal");
}
function IsMappedKey(value2) {
  return IsKindOf(value2, "MappedKey");
}
function IsMappedResult(value2) {
  return IsKindOf(value2, "MappedResult");
}
function IsNever(value2) {
  return IsKindOf(value2, "Never");
}
function IsNot(value2) {
  return IsKindOf(value2, "Not");
}
function IsNull3(value2) {
  return IsKindOf(value2, "Null");
}
function IsNumber3(value2) {
  return IsKindOf(value2, "Number");
}
function IsObject3(value2) {
  return IsKindOf(value2, "Object");
}
function IsPromise2(value2) {
  return IsKindOf(value2, "Promise");
}
function IsRecord(value2) {
  return IsKindOf(value2, "Record");
}
function IsRef(value2) {
  return IsKindOf(value2, "Ref");
}
function IsRegExp2(value2) {
  return IsKindOf(value2, "RegExp");
}
function IsString3(value2) {
  return IsKindOf(value2, "String");
}
function IsSymbol3(value2) {
  return IsKindOf(value2, "Symbol");
}
function IsTemplateLiteral(value2) {
  return IsKindOf(value2, "TemplateLiteral");
}
function IsThis(value2) {
  return IsKindOf(value2, "This");
}
function IsTransform(value2) {
  return IsObject2(value2) && TransformKind in value2;
}
function IsTuple(value2) {
  return IsKindOf(value2, "Tuple");
}
function IsUndefined3(value2) {
  return IsKindOf(value2, "Undefined");
}
function IsUnion(value2) {
  return IsKindOf(value2, "Union");
}
function IsUint8Array3(value2) {
  return IsKindOf(value2, "Uint8Array");
}
function IsUnknown(value2) {
  return IsKindOf(value2, "Unknown");
}
function IsUnsafe(value2) {
  return IsKindOf(value2, "Unsafe");
}
function IsVoid(value2) {
  return IsKindOf(value2, "Void");
}
function IsKind(value2) {
  return IsObject2(value2) && Kind in value2 && IsString2(value2[Kind]);
}
function IsSchema(value2) {
  return IsAny(value2) || IsArgument(value2) || IsArray3(value2) || IsBoolean3(value2) || IsBigInt3(value2) || IsAsyncIterator3(value2) || IsComputed(value2) || IsConstructor(value2) || IsDate3(value2) || IsFunction3(value2) || IsInteger2(value2) || IsIntersect(value2) || IsIterator3(value2) || IsLiteral(value2) || IsMappedKey(value2) || IsMappedResult(value2) || IsNever(value2) || IsNot(value2) || IsNull3(value2) || IsNumber3(value2) || IsObject3(value2) || IsPromise2(value2) || IsRecord(value2) || IsRef(value2) || IsRegExp2(value2) || IsString3(value2) || IsSymbol3(value2) || IsTemplateLiteral(value2) || IsThis(value2) || IsTuple(value2) || IsUndefined3(value2) || IsUnion(value2) || IsUint8Array3(value2) || IsUnknown(value2) || IsUnsafe(value2) || IsVoid(value2) || IsKind(value2);
}

// node_modules/@sinclair/typebox/build/esm/type/optional/optional.mjs
function RemoveOptional(schema) {
  return CreateType(Discard(schema, [OptionalKind]));
}
function AddOptional(schema) {
  return CreateType({ ...schema, [OptionalKind]: "Optional" });
}
function OptionalWithFlag(schema, F) {
  return F === false ? RemoveOptional(schema) : AddOptional(schema);
}
function Optional(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? OptionalFromMappedResult(schema, F) : OptionalWithFlag(schema, F);
}

// node_modules/@sinclair/typebox/build/esm/type/optional/optional-from-mapped-result.mjs
function FromProperties(P, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Optional(P[K2], F);
  return Acc;
}
function FromMappedResult(R, F) {
  return FromProperties(R.properties, F);
}
function OptionalFromMappedResult(R, F) {
  const P = FromMappedResult(R, F);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-create.mjs
function IntersectCreate(T, options = {}) {
  const allObjects = T.every((schema) => IsObject3(schema));
  const clonedUnevaluatedProperties = IsSchema(options.unevaluatedProperties) ? { unevaluatedProperties: options.unevaluatedProperties } : {};
  return CreateType(options.unevaluatedProperties === false || IsSchema(options.unevaluatedProperties) || allObjects ? { ...clonedUnevaluatedProperties, [Kind]: "Intersect", type: "object", allOf: T } : { ...clonedUnevaluatedProperties, [Kind]: "Intersect", allOf: T }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect-evaluated.mjs
function IsIntersectOptional(types) {
  return types.every((left) => IsOptional(left));
}
function RemoveOptionalFromType(type) {
  return Discard(type, [OptionalKind]);
}
function RemoveOptionalFromRest(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType(left) : left);
}
function ResolveIntersect(types, options) {
  return IsIntersectOptional(types) ? Optional(IntersectCreate(RemoveOptionalFromRest(types), options)) : IntersectCreate(RemoveOptionalFromRest(types), options);
}
function IntersectEvaluated(types, options = {}) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return ResolveIntersect(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intersect/intersect.mjs
function Intersect(types, options) {
  if (types.length === 1)
    return CreateType(types[0], options);
  if (types.length === 0)
    return Never(options);
  if (types.some((schema) => IsTransform(schema)))
    throw new Error("Cannot intersect transform types");
  return IntersectCreate(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union-create.mjs
function UnionCreate(T, options) {
  return CreateType({ [Kind]: "Union", anyOf: T }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union-evaluated.mjs
function IsUnionOptional(types) {
  return types.some((type) => IsOptional(type));
}
function RemoveOptionalFromRest2(types) {
  return types.map((left) => IsOptional(left) ? RemoveOptionalFromType2(left) : left);
}
function RemoveOptionalFromType2(T) {
  return Discard(T, [OptionalKind]);
}
function ResolveUnion(types, options) {
  const isOptional = IsUnionOptional(types);
  return isOptional ? Optional(UnionCreate(RemoveOptionalFromRest2(types), options)) : UnionCreate(RemoveOptionalFromRest2(types), options);
}
function UnionEvaluated(T, options) {
  return T.length === 1 ? CreateType(T[0], options) : T.length === 0 ? Never(options) : ResolveUnion(T, options);
}

// node_modules/@sinclair/typebox/build/esm/type/union/union.mjs
function Union(types, options) {
  return types.length === 0 ? Never(options) : types.length === 1 ? CreateType(types[0], options) : UnionCreate(types, options);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/parse.mjs
var TemplateLiteralParserError = class extends TypeBoxError {
};
function Unescape(pattern) {
  return pattern.replace(/\\\$/g, "$").replace(/\\\*/g, "*").replace(/\\\^/g, "^").replace(/\\\|/g, "|").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
}
function IsNonEscaped(pattern, index, char) {
  return pattern[index] === char && pattern.charCodeAt(index - 1) !== 92;
}
function IsOpenParen(pattern, index) {
  return IsNonEscaped(pattern, index, "(");
}
function IsCloseParen(pattern, index) {
  return IsNonEscaped(pattern, index, ")");
}
function IsSeparator(pattern, index) {
  return IsNonEscaped(pattern, index, "|");
}
function IsGroup(pattern) {
  if (!(IsOpenParen(pattern, 0) && IsCloseParen(pattern, pattern.length - 1)))
    return false;
  let count = 0;
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (count === 0 && index !== pattern.length - 1)
      return false;
  }
  return true;
}
function InGroup(pattern) {
  return pattern.slice(1, pattern.length - 1);
}
function IsPrecedenceOr(pattern) {
  let count = 0;
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0)
      return true;
  }
  return false;
}
function IsPrecedenceAnd(pattern) {
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      return true;
  }
  return false;
}
function Or(pattern) {
  let [count, start] = [0, 0];
  const expressions = [];
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index))
      count += 1;
    if (IsCloseParen(pattern, index))
      count -= 1;
    if (IsSeparator(pattern, index) && count === 0) {
      const range2 = pattern.slice(start, index);
      if (range2.length > 0)
        expressions.push(TemplateLiteralParse(range2));
      start = index + 1;
    }
  }
  const range = pattern.slice(start);
  if (range.length > 0)
    expressions.push(TemplateLiteralParse(range));
  if (expressions.length === 0)
    return { type: "const", const: "" };
  if (expressions.length === 1)
    return expressions[0];
  return { type: "or", expr: expressions };
}
function And(pattern) {
  function Group(value2, index) {
    if (!IsOpenParen(value2, index))
      throw new TemplateLiteralParserError(`TemplateLiteralParser: Index must point to open parens`);
    let count = 0;
    for (let scan = index; scan < value2.length; scan++) {
      if (IsOpenParen(value2, scan))
        count += 1;
      if (IsCloseParen(value2, scan))
        count -= 1;
      if (count === 0)
        return [index, scan];
    }
    throw new TemplateLiteralParserError(`TemplateLiteralParser: Unclosed group parens in expression`);
  }
  function Range(pattern2, index) {
    for (let scan = index; scan < pattern2.length; scan++) {
      if (IsOpenParen(pattern2, scan))
        return [index, scan];
    }
    return [index, pattern2.length];
  }
  const expressions = [];
  for (let index = 0; index < pattern.length; index++) {
    if (IsOpenParen(pattern, index)) {
      const [start, end] = Group(pattern, index);
      const range = pattern.slice(start, end + 1);
      expressions.push(TemplateLiteralParse(range));
      index = end;
    } else {
      const [start, end] = Range(pattern, index);
      const range = pattern.slice(start, end);
      if (range.length > 0)
        expressions.push(TemplateLiteralParse(range));
      index = end - 1;
    }
  }
  return expressions.length === 0 ? { type: "const", const: "" } : expressions.length === 1 ? expressions[0] : { type: "and", expr: expressions };
}
function TemplateLiteralParse(pattern) {
  return IsGroup(pattern) ? TemplateLiteralParse(InGroup(pattern)) : IsPrecedenceOr(pattern) ? Or(pattern) : IsPrecedenceAnd(pattern) ? And(pattern) : { type: "const", const: Unescape(pattern) };
}
function TemplateLiteralParseExact(pattern) {
  return TemplateLiteralParse(pattern.slice(1, pattern.length - 1));
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/finite.mjs
var TemplateLiteralFiniteError = class extends TypeBoxError {
};
function IsNumberExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "0" && expression.expr[1].type === "const" && expression.expr[1].const === "[1-9][0-9]*";
}
function IsBooleanExpression(expression) {
  return expression.type === "or" && expression.expr.length === 2 && expression.expr[0].type === "const" && expression.expr[0].const === "true" && expression.expr[1].type === "const" && expression.expr[1].const === "false";
}
function IsStringExpression(expression) {
  return expression.type === "const" && expression.const === ".*";
}
function IsTemplateLiteralExpressionFinite(expression) {
  return IsNumberExpression(expression) || IsStringExpression(expression) ? false : IsBooleanExpression(expression) ? true : expression.type === "and" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "or" ? expression.expr.every((expr) => IsTemplateLiteralExpressionFinite(expr)) : expression.type === "const" ? true : (() => {
    throw new TemplateLiteralFiniteError(`Unknown expression type`);
  })();
}
function IsTemplateLiteralFinite(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/generate.mjs
var TemplateLiteralGenerateError = class extends TypeBoxError {
};
function* GenerateReduce(buffer) {
  if (buffer.length === 1)
    return yield* buffer[0];
  for (const left of buffer[0]) {
    for (const right of GenerateReduce(buffer.slice(1))) {
      yield `${left}${right}`;
    }
  }
}
function* GenerateAnd(expression) {
  return yield* GenerateReduce(expression.expr.map((expr) => [...TemplateLiteralExpressionGenerate(expr)]));
}
function* GenerateOr(expression) {
  for (const expr of expression.expr)
    yield* TemplateLiteralExpressionGenerate(expr);
}
function* GenerateConst(expression) {
  return yield expression.const;
}
function* TemplateLiteralExpressionGenerate(expression) {
  return expression.type === "and" ? yield* GenerateAnd(expression) : expression.type === "or" ? yield* GenerateOr(expression) : expression.type === "const" ? yield* GenerateConst(expression) : (() => {
    throw new TemplateLiteralGenerateError("Unknown expression");
  })();
}
function TemplateLiteralGenerate(schema) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  return IsTemplateLiteralExpressionFinite(expression) ? [...TemplateLiteralExpressionGenerate(expression)] : [];
}

// node_modules/@sinclair/typebox/build/esm/type/literal/literal.mjs
function Literal(value2, options) {
  return CreateType({
    [Kind]: "Literal",
    const: value2,
    type: typeof value2
  }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/boolean/boolean.mjs
function Boolean(options) {
  return CreateType({ [Kind]: "Boolean", type: "boolean" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/bigint/bigint.mjs
function BigInt2(options) {
  return CreateType({ [Kind]: "BigInt", type: "bigint" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/number/number.mjs
function Number2(options) {
  return CreateType({ [Kind]: "Number", type: "number" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/string/string.mjs
function String2(options) {
  return CreateType({ [Kind]: "String", type: "string" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/syntax.mjs
function* FromUnion(syntax) {
  const trim = syntax.trim().replace(/"|'/g, "");
  return trim === "boolean" ? yield Boolean() : trim === "number" ? yield Number2() : trim === "bigint" ? yield BigInt2() : trim === "string" ? yield String2() : yield (() => {
    const literals = trim.split("|").map((literal) => Literal(literal.trim()));
    return literals.length === 0 ? Never() : literals.length === 1 ? literals[0] : UnionEvaluated(literals);
  })();
}
function* FromTerminal(syntax) {
  if (syntax[1] !== "{") {
    const L = Literal("$");
    const R = FromSyntax(syntax.slice(1));
    return yield* [L, ...R];
  }
  for (let i = 2; i < syntax.length; i++) {
    if (syntax[i] === "}") {
      const L = FromUnion(syntax.slice(2, i));
      const R = FromSyntax(syntax.slice(i + 1));
      return yield* [...L, ...R];
    }
  }
  yield Literal(syntax);
}
function* FromSyntax(syntax) {
  for (let i = 0; i < syntax.length; i++) {
    if (syntax[i] === "$") {
      const L = Literal(syntax.slice(0, i));
      const R = FromTerminal(syntax.slice(i));
      return yield* [L, ...R];
    }
  }
  yield Literal(syntax);
}
function TemplateLiteralSyntax(syntax) {
  return [...FromSyntax(syntax)];
}

// node_modules/@sinclair/typebox/build/esm/type/patterns/patterns.mjs
var PatternBoolean = "(true|false)";
var PatternNumber = "(0|[1-9][0-9]*)";
var PatternString = "(.*)";
var PatternNever = "(?!.*)";
var PatternBooleanExact = `^${PatternBoolean}$`;
var PatternNumberExact = `^${PatternNumber}$`;
var PatternStringExact = `^${PatternString}$`;
var PatternNeverExact = `^${PatternNever}$`;

// node_modules/@sinclair/typebox/build/esm/type/template-literal/pattern.mjs
var TemplateLiteralPatternError = class extends TypeBoxError {
};
function Escape(value2) {
  return value2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function Visit2(schema, acc) {
  return IsTemplateLiteral(schema) ? schema.pattern.slice(1, schema.pattern.length - 1) : IsUnion(schema) ? `(${schema.anyOf.map((schema2) => Visit2(schema2, acc)).join("|")})` : IsNumber3(schema) ? `${acc}${PatternNumber}` : IsInteger2(schema) ? `${acc}${PatternNumber}` : IsBigInt3(schema) ? `${acc}${PatternNumber}` : IsString3(schema) ? `${acc}${PatternString}` : IsLiteral(schema) ? `${acc}${Escape(schema.const.toString())}` : IsBoolean3(schema) ? `${acc}${PatternBoolean}` : (() => {
    throw new TemplateLiteralPatternError(`Unexpected Kind '${schema[Kind]}'`);
  })();
}
function TemplateLiteralPattern(kinds) {
  return `^${kinds.map((schema) => Visit2(schema, "")).join("")}$`;
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/union.mjs
function TemplateLiteralToUnion(schema) {
  const R = TemplateLiteralGenerate(schema);
  const L = R.map((S) => Literal(S));
  return UnionEvaluated(L);
}

// node_modules/@sinclair/typebox/build/esm/type/template-literal/template-literal.mjs
function TemplateLiteral(unresolved, options) {
  const pattern = IsString2(unresolved) ? TemplateLiteralPattern(TemplateLiteralSyntax(unresolved)) : TemplateLiteralPattern(unresolved);
  return CreateType({ [Kind]: "TemplateLiteral", type: "string", pattern }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-property-keys.mjs
function FromTemplateLiteral(templateLiteral) {
  const keys = TemplateLiteralGenerate(templateLiteral);
  return keys.map((key) => key.toString());
}
function FromUnion2(types) {
  const result = [];
  for (const type of types)
    result.push(...IndexPropertyKeys(type));
  return result;
}
function FromLiteral(literalValue) {
  return [literalValue.toString()];
}
function IndexPropertyKeys(type) {
  return [...new Set(IsTemplateLiteral(type) ? FromTemplateLiteral(type) : IsUnion(type) ? FromUnion2(type.anyOf) : IsLiteral(type) ? FromLiteral(type.const) : IsNumber3(type) ? ["[number]"] : IsInteger2(type) ? ["[number]"] : [])];
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-result.mjs
function FromProperties2(type, properties, options) {
  const result = {};
  for (const K2 of Object.getOwnPropertyNames(properties)) {
    result[K2] = Index(type, IndexPropertyKeys(properties[K2]), options);
  }
  return result;
}
function FromMappedResult2(type, mappedResult, options) {
  return FromProperties2(type, mappedResult.properties, options);
}
function IndexFromMappedResult(type, mappedResult, options) {
  const properties = FromMappedResult2(type, mappedResult, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed.mjs
function FromRest(types, key) {
  return types.map((type) => IndexFromPropertyKey(type, key));
}
function FromIntersectRest(types) {
  return types.filter((type) => !IsNever(type));
}
function FromIntersect(types, key) {
  return IntersectEvaluated(FromIntersectRest(FromRest(types, key)));
}
function FromUnionRest(types) {
  return types.some((L) => IsNever(L)) ? [] : types;
}
function FromUnion3(types, key) {
  return UnionEvaluated(FromUnionRest(FromRest(types, key)));
}
function FromTuple(types, key) {
  return key in types ? types[key] : key === "[number]" ? UnionEvaluated(types) : Never();
}
function FromArray(type, key) {
  return key === "[number]" ? type : Never();
}
function FromProperty(properties, propertyKey) {
  return propertyKey in properties ? properties[propertyKey] : Never();
}
function IndexFromPropertyKey(type, propertyKey) {
  return IsIntersect(type) ? FromIntersect(type.allOf, propertyKey) : IsUnion(type) ? FromUnion3(type.anyOf, propertyKey) : IsTuple(type) ? FromTuple(type.items ?? [], propertyKey) : IsArray3(type) ? FromArray(type.items, propertyKey) : IsObject3(type) ? FromProperty(type.properties, propertyKey) : Never();
}
function IndexFromPropertyKeys(type, propertyKeys) {
  return propertyKeys.map((propertyKey) => IndexFromPropertyKey(type, propertyKey));
}
function FromSchema(type, propertyKeys) {
  return UnionEvaluated(IndexFromPropertyKeys(type, propertyKeys));
}
function Index(type, key, options) {
  if (IsRef(type) || IsRef(key)) {
    const error = `Index types using Ref parameters require both Type and Key to be of TSchema`;
    if (!IsSchema(type) || !IsSchema(key))
      throw new TypeBoxError(error);
    return Computed("Index", [type, key]);
  }
  if (IsMappedResult(key))
    return IndexFromMappedResult(type, key, options);
  if (IsMappedKey(key))
    return IndexFromMappedKey(type, key, options);
  return CreateType(IsSchema(key) ? FromSchema(type, IndexPropertyKeys(key)) : FromSchema(type, key), options);
}

// node_modules/@sinclair/typebox/build/esm/type/indexed/indexed-from-mapped-key.mjs
function MappedIndexPropertyKey(type, key, options) {
  return { [key]: Index(type, [key], Clone(options)) };
}
function MappedIndexPropertyKeys(type, propertyKeys, options) {
  return propertyKeys.reduce((result, left) => {
    return { ...result, ...MappedIndexPropertyKey(type, left, options) };
  }, {});
}
function MappedIndexProperties(type, mappedKey, options) {
  return MappedIndexPropertyKeys(type, mappedKey.keys, options);
}
function IndexFromMappedKey(type, mappedKey, options) {
  const properties = MappedIndexProperties(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/iterator/iterator.mjs
function Iterator(items, options) {
  return CreateType({ [Kind]: "Iterator", type: "Iterator", items }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/object/object.mjs
function RequiredArray(properties) {
  return globalThis.Object.keys(properties).filter((key) => !IsOptional(properties[key]));
}
function _Object(properties, options) {
  const required = RequiredArray(properties);
  const schema = required.length > 0 ? { [Kind]: "Object", type: "object", required, properties } : { [Kind]: "Object", type: "object", properties };
  return CreateType(schema, options);
}
var Object2 = _Object;

// node_modules/@sinclair/typebox/build/esm/type/promise/promise.mjs
function Promise2(item, options) {
  return CreateType({ [Kind]: "Promise", type: "Promise", item }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly/readonly.mjs
function RemoveReadonly(schema) {
  return CreateType(Discard(schema, [ReadonlyKind]));
}
function AddReadonly(schema) {
  return CreateType({ ...schema, [ReadonlyKind]: "Readonly" });
}
function ReadonlyWithFlag(schema, F) {
  return F === false ? RemoveReadonly(schema) : AddReadonly(schema);
}
function Readonly(schema, enable) {
  const F = enable ?? true;
  return IsMappedResult(schema) ? ReadonlyFromMappedResult(schema, F) : ReadonlyWithFlag(schema, F);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly/readonly-from-mapped-result.mjs
function FromProperties3(K, F) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Readonly(K[K2], F);
  return Acc;
}
function FromMappedResult3(R, F) {
  return FromProperties3(R.properties, F);
}
function ReadonlyFromMappedResult(R, F) {
  const P = FromMappedResult3(R, F);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/tuple/tuple.mjs
function Tuple(types, options) {
  return CreateType(types.length > 0 ? { [Kind]: "Tuple", type: "array", items: types, additionalItems: false, minItems: types.length, maxItems: types.length } : { [Kind]: "Tuple", type: "array", minItems: types.length, maxItems: types.length }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/sets/set.mjs
function SetIncludes(T, S) {
  return T.includes(S);
}
function SetDistinct(T) {
  return [...new Set(T)];
}
function SetIntersect(T, S) {
  return T.filter((L) => S.includes(L));
}
function SetIntersectManyResolve(T, Init) {
  return T.reduce((Acc, L) => {
    return SetIntersect(Acc, L);
  }, Init);
}
function SetIntersectMany(T) {
  return T.length === 1 ? T[0] : T.length > 1 ? SetIntersectManyResolve(T.slice(1), T[0]) : [];
}
function SetUnionMany(T) {
  const Acc = [];
  for (const L of T)
    Acc.push(...L);
  return Acc;
}

// node_modules/@sinclair/typebox/build/esm/type/mapped/mapped.mjs
function FromMappedResult4(K, P) {
  return K in P ? FromSchemaType(K, P[K]) : MappedResult(P);
}
function MappedKeyToKnownMappedResultProperties(K) {
  return { [K]: Literal(K) };
}
function MappedKeyToUnknownMappedResultProperties(P) {
  const Acc = {};
  for (const L of P)
    Acc[L] = Literal(L);
  return Acc;
}
function MappedKeyToMappedResultProperties(K, P) {
  return SetIncludes(P, K) ? MappedKeyToKnownMappedResultProperties(K) : MappedKeyToUnknownMappedResultProperties(P);
}
function FromMappedKey(K, P) {
  const R = MappedKeyToMappedResultProperties(K, P);
  return FromMappedResult4(K, R);
}
function FromRest2(K, T) {
  return T.map((L) => FromSchemaType(K, L));
}
function FromProperties4(K, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(T))
    Acc[K2] = FromSchemaType(K, T[K2]);
  return Acc;
}
function FromSchemaType(K, T) {
  const options = { ...T };
  return (
    // unevaluated modifier types
    IsOptional(T) ? Optional(FromSchemaType(K, Discard(T, [OptionalKind]))) : IsReadonly(T) ? Readonly(FromSchemaType(K, Discard(T, [ReadonlyKind]))) : (
      // unevaluated mapped types
      IsMappedResult(T) ? FromMappedResult4(K, T.properties) : IsMappedKey(T) ? FromMappedKey(K, T.keys) : (
        // unevaluated types
        IsConstructor(T) ? Constructor(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsFunction3(T) ? Function(FromRest2(K, T.parameters), FromSchemaType(K, T.returns), options) : IsAsyncIterator3(T) ? AsyncIterator(FromSchemaType(K, T.items), options) : IsIterator3(T) ? Iterator(FromSchemaType(K, T.items), options) : IsIntersect(T) ? Intersect(FromRest2(K, T.allOf), options) : IsUnion(T) ? Union(FromRest2(K, T.anyOf), options) : IsTuple(T) ? Tuple(FromRest2(K, T.items ?? []), options) : IsObject3(T) ? Object2(FromProperties4(K, T.properties), options) : IsArray3(T) ? Array2(FromSchemaType(K, T.items), options) : IsPromise2(T) ? Promise2(FromSchemaType(K, T.item), options) : T
      )
    )
  );
}
function MappedFunctionReturnType(K, T) {
  const Acc = {};
  for (const L of K)
    Acc[L] = FromSchemaType(L, T);
  return Acc;
}
function Mapped(key, map3, options) {
  const K = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const RT = map3({ [Kind]: "MappedKey", keys: K });
  const R = MappedFunctionReturnType(K, RT);
  return Object2(R, options);
}

// node_modules/@sinclair/typebox/build/esm/type/ref/ref.mjs
function Ref(...args) {
  const [$ref, options] = typeof args[0] === "string" ? [args[0], args[1]] : [args[0].$id, args[1]];
  if (typeof $ref !== "string")
    throw new TypeBoxError("Ref: $ref must be a string");
  return CreateType({ [Kind]: "Ref", $ref }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-keys.mjs
function FromRest3(types) {
  const result = [];
  for (const L of types)
    result.push(KeyOfPropertyKeys(L));
  return result;
}
function FromIntersect2(types) {
  const propertyKeysArray = FromRest3(types);
  const propertyKeys = SetUnionMany(propertyKeysArray);
  return propertyKeys;
}
function FromUnion4(types) {
  const propertyKeysArray = FromRest3(types);
  const propertyKeys = SetIntersectMany(propertyKeysArray);
  return propertyKeys;
}
function FromTuple2(types) {
  return types.map((_, indexer) => indexer.toString());
}
function FromArray2(_) {
  return ["[number]"];
}
function FromProperties5(T) {
  return globalThis.Object.getOwnPropertyNames(T);
}
function FromPatternProperties(patternProperties) {
  if (!includePatternProperties)
    return [];
  const patternPropertyKeys = globalThis.Object.getOwnPropertyNames(patternProperties);
  return patternPropertyKeys.map((key) => {
    return key[0] === "^" && key[key.length - 1] === "$" ? key.slice(1, key.length - 1) : key;
  });
}
function KeyOfPropertyKeys(type) {
  return IsIntersect(type) ? FromIntersect2(type.allOf) : IsUnion(type) ? FromUnion4(type.anyOf) : IsTuple(type) ? FromTuple2(type.items ?? []) : IsArray3(type) ? FromArray2(type.items) : IsObject3(type) ? FromProperties5(type.properties) : IsRecord(type) ? FromPatternProperties(type.patternProperties) : [];
}
var includePatternProperties = false;
function KeyOfPattern(schema) {
  includePatternProperties = true;
  const keys = KeyOfPropertyKeys(schema);
  includePatternProperties = false;
  const pattern = keys.map((key) => `(${key})`);
  return `^(${pattern.join("|")})$`;
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof.mjs
function FromComputed(target, parameters) {
  return Computed("KeyOf", [Computed(target, parameters)]);
}
function FromRef($ref) {
  return Computed("KeyOf", [Ref($ref)]);
}
function KeyOfFromType(type, options) {
  const propertyKeys = KeyOfPropertyKeys(type);
  const propertyKeyTypes = KeyOfPropertyKeysToRest(propertyKeys);
  const result = UnionEvaluated(propertyKeyTypes);
  return CreateType(result, options);
}
function KeyOfPropertyKeysToRest(propertyKeys) {
  return propertyKeys.map((L) => L === "[number]" ? Number2() : Literal(L));
}
function KeyOf(type, options) {
  return IsComputed(type) ? FromComputed(type.target, type.parameters) : IsRef(type) ? FromRef(type.$ref) : IsMappedResult(type) ? KeyOfFromMappedResult(type, options) : KeyOfFromType(type, options);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-from-mapped-result.mjs
function FromProperties6(properties, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = KeyOf(properties[K2], Clone(options));
  return result;
}
function FromMappedResult5(mappedResult, options) {
  return FromProperties6(mappedResult.properties, options);
}
function KeyOfFromMappedResult(mappedResult, options) {
  const properties = FromMappedResult5(mappedResult, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/keyof/keyof-property-entries.mjs
function KeyOfPropertyEntries(schema) {
  const keys = KeyOfPropertyKeys(schema);
  const schemas = IndexFromPropertyKeys(schema, keys);
  return keys.map((_, index) => [keys[index], schemas[index]]);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-undefined.mjs
function Intersect2(schema) {
  return schema.allOf.every((schema2) => ExtendsUndefinedCheck(schema2));
}
function Union2(schema) {
  return schema.anyOf.some((schema2) => ExtendsUndefinedCheck(schema2));
}
function Not(schema) {
  return !ExtendsUndefinedCheck(schema.not);
}
function ExtendsUndefinedCheck(schema) {
  return schema[Kind] === "Intersect" ? Intersect2(schema) : schema[Kind] === "Union" ? Union2(schema) : schema[Kind] === "Not" ? Not(schema) : schema[Kind] === "Undefined" ? true : false;
}

// node_modules/@sinclair/typebox/build/esm/errors/function.mjs
function DefaultErrorFunction(error) {
  switch (error.errorType) {
    case ValueErrorType.ArrayContains:
      return "Expected array to contain at least one matching value";
    case ValueErrorType.ArrayMaxContains:
      return `Expected array to contain no more than ${error.schema.maxContains} matching values`;
    case ValueErrorType.ArrayMinContains:
      return `Expected array to contain at least ${error.schema.minContains} matching values`;
    case ValueErrorType.ArrayMaxItems:
      return `Expected array length to be less or equal to ${error.schema.maxItems}`;
    case ValueErrorType.ArrayMinItems:
      return `Expected array length to be greater or equal to ${error.schema.minItems}`;
    case ValueErrorType.ArrayUniqueItems:
      return "Expected array elements to be unique";
    case ValueErrorType.Array:
      return "Expected array";
    case ValueErrorType.AsyncIterator:
      return "Expected AsyncIterator";
    case ValueErrorType.BigIntExclusiveMaximum:
      return `Expected bigint to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.BigIntExclusiveMinimum:
      return `Expected bigint to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.BigIntMaximum:
      return `Expected bigint to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.BigIntMinimum:
      return `Expected bigint to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.BigIntMultipleOf:
      return `Expected bigint to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.BigInt:
      return "Expected bigint";
    case ValueErrorType.Boolean:
      return "Expected boolean";
    case ValueErrorType.DateExclusiveMinimumTimestamp:
      return `Expected Date timestamp to be greater than ${error.schema.exclusiveMinimumTimestamp}`;
    case ValueErrorType.DateExclusiveMaximumTimestamp:
      return `Expected Date timestamp to be less than ${error.schema.exclusiveMaximumTimestamp}`;
    case ValueErrorType.DateMinimumTimestamp:
      return `Expected Date timestamp to be greater or equal to ${error.schema.minimumTimestamp}`;
    case ValueErrorType.DateMaximumTimestamp:
      return `Expected Date timestamp to be less or equal to ${error.schema.maximumTimestamp}`;
    case ValueErrorType.DateMultipleOfTimestamp:
      return `Expected Date timestamp to be a multiple of ${error.schema.multipleOfTimestamp}`;
    case ValueErrorType.Date:
      return "Expected Date";
    case ValueErrorType.Function:
      return "Expected function";
    case ValueErrorType.IntegerExclusiveMaximum:
      return `Expected integer to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.IntegerExclusiveMinimum:
      return `Expected integer to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.IntegerMaximum:
      return `Expected integer to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.IntegerMinimum:
      return `Expected integer to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.IntegerMultipleOf:
      return `Expected integer to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Integer:
      return "Expected integer";
    case ValueErrorType.IntersectUnevaluatedProperties:
      return "Unexpected property";
    case ValueErrorType.Intersect:
      return "Expected all values to match";
    case ValueErrorType.Iterator:
      return "Expected Iterator";
    case ValueErrorType.Literal:
      return `Expected ${typeof error.schema.const === "string" ? `'${error.schema.const}'` : error.schema.const}`;
    case ValueErrorType.Never:
      return "Never";
    case ValueErrorType.Not:
      return "Value should not match";
    case ValueErrorType.Null:
      return "Expected null";
    case ValueErrorType.NumberExclusiveMaximum:
      return `Expected number to be less than ${error.schema.exclusiveMaximum}`;
    case ValueErrorType.NumberExclusiveMinimum:
      return `Expected number to be greater than ${error.schema.exclusiveMinimum}`;
    case ValueErrorType.NumberMaximum:
      return `Expected number to be less or equal to ${error.schema.maximum}`;
    case ValueErrorType.NumberMinimum:
      return `Expected number to be greater or equal to ${error.schema.minimum}`;
    case ValueErrorType.NumberMultipleOf:
      return `Expected number to be a multiple of ${error.schema.multipleOf}`;
    case ValueErrorType.Number:
      return "Expected number";
    case ValueErrorType.Object:
      return "Expected object";
    case ValueErrorType.ObjectAdditionalProperties:
      return "Unexpected property";
    case ValueErrorType.ObjectMaxProperties:
      return `Expected object to have no more than ${error.schema.maxProperties} properties`;
    case ValueErrorType.ObjectMinProperties:
      return `Expected object to have at least ${error.schema.minProperties} properties`;
    case ValueErrorType.ObjectRequiredProperty:
      return "Expected required property";
    case ValueErrorType.Promise:
      return "Expected Promise";
    case ValueErrorType.RegExp:
      return "Expected string to match regular expression";
    case ValueErrorType.StringFormatUnknown:
      return `Unknown format '${error.schema.format}'`;
    case ValueErrorType.StringFormat:
      return `Expected string to match '${error.schema.format}' format`;
    case ValueErrorType.StringMaxLength:
      return `Expected string length less or equal to ${error.schema.maxLength}`;
    case ValueErrorType.StringMinLength:
      return `Expected string length greater or equal to ${error.schema.minLength}`;
    case ValueErrorType.StringPattern:
      return `Expected string to match '${error.schema.pattern}'`;
    case ValueErrorType.String:
      return "Expected string";
    case ValueErrorType.Symbol:
      return "Expected symbol";
    case ValueErrorType.TupleLength:
      return `Expected tuple to have ${error.schema.maxItems || 0} elements`;
    case ValueErrorType.Tuple:
      return "Expected tuple";
    case ValueErrorType.Uint8ArrayMaxByteLength:
      return `Expected byte length less or equal to ${error.schema.maxByteLength}`;
    case ValueErrorType.Uint8ArrayMinByteLength:
      return `Expected byte length greater or equal to ${error.schema.minByteLength}`;
    case ValueErrorType.Uint8Array:
      return "Expected Uint8Array";
    case ValueErrorType.Undefined:
      return "Expected undefined";
    case ValueErrorType.Union:
      return "Expected union value";
    case ValueErrorType.Void:
      return "Expected void";
    case ValueErrorType.Kind:
      return `Expected kind '${error.schema[Kind]}'`;
    default:
      return "Unknown error type";
  }
}
var errorFunction = DefaultErrorFunction;
function GetErrorFunction() {
  return errorFunction;
}

// node_modules/@sinclair/typebox/build/esm/value/deref/deref.mjs
var TypeDereferenceError = class extends TypeBoxError {
  constructor(schema) {
    super(`Unable to dereference schema with $id '${schema.$ref}'`);
    this.schema = schema;
  }
};
function Resolve(schema, references) {
  const target = references.find((target2) => target2.$id === schema.$ref);
  if (target === void 0)
    throw new TypeDereferenceError(schema);
  return Deref(target, references);
}
function Pushref(schema, references) {
  if (!IsString(schema.$id) || references.some((target) => target.$id === schema.$id))
    return references;
  references.push(schema);
  return references;
}
function Deref(schema, references) {
  return schema[Kind] === "This" || schema[Kind] === "Ref" ? Resolve(schema, references) : schema;
}

// node_modules/@sinclair/typebox/build/esm/value/hash/hash.mjs
var ValueHashError = class extends TypeBoxError {
  constructor(value2) {
    super(`Unable to hash value`);
    this.value = value2;
  }
};
var ByteMarker;
(function(ByteMarker2) {
  ByteMarker2[ByteMarker2["Undefined"] = 0] = "Undefined";
  ByteMarker2[ByteMarker2["Null"] = 1] = "Null";
  ByteMarker2[ByteMarker2["Boolean"] = 2] = "Boolean";
  ByteMarker2[ByteMarker2["Number"] = 3] = "Number";
  ByteMarker2[ByteMarker2["String"] = 4] = "String";
  ByteMarker2[ByteMarker2["Object"] = 5] = "Object";
  ByteMarker2[ByteMarker2["Array"] = 6] = "Array";
  ByteMarker2[ByteMarker2["Date"] = 7] = "Date";
  ByteMarker2[ByteMarker2["Uint8Array"] = 8] = "Uint8Array";
  ByteMarker2[ByteMarker2["Symbol"] = 9] = "Symbol";
  ByteMarker2[ByteMarker2["BigInt"] = 10] = "BigInt";
})(ByteMarker || (ByteMarker = {}));
var Accumulator = BigInt("14695981039346656037");
var [Prime, Size] = [BigInt("1099511628211"), BigInt(
  "18446744073709551616"
  /* 2 ^ 64 */
)];
var Bytes = Array.from({ length: 256 }).map((_, i) => BigInt(i));
var F64 = new Float64Array(1);
var F64In = new DataView(F64.buffer);
var F64Out = new Uint8Array(F64.buffer);
function* NumberToBytes(value2) {
  const byteCount = value2 === 0 ? 1 : Math.ceil(Math.floor(Math.log2(value2) + 1) / 8);
  for (let i = 0; i < byteCount; i++) {
    yield value2 >> 8 * (byteCount - 1 - i) & 255;
  }
}
function ArrayType2(value2) {
  FNV1A64(ByteMarker.Array);
  for (const item of value2) {
    Visit3(item);
  }
}
function BooleanType(value2) {
  FNV1A64(ByteMarker.Boolean);
  FNV1A64(value2 ? 1 : 0);
}
function BigIntType(value2) {
  FNV1A64(ByteMarker.BigInt);
  F64In.setBigInt64(0, value2);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function DateType2(value2) {
  FNV1A64(ByteMarker.Date);
  Visit3(value2.getTime());
}
function NullType(value2) {
  FNV1A64(ByteMarker.Null);
}
function NumberType(value2) {
  FNV1A64(ByteMarker.Number);
  F64In.setFloat64(0, value2);
  for (const byte of F64Out) {
    FNV1A64(byte);
  }
}
function ObjectType2(value2) {
  FNV1A64(ByteMarker.Object);
  for (const key of globalThis.Object.getOwnPropertyNames(value2).sort()) {
    Visit3(key);
    Visit3(value2[key]);
  }
}
function StringType(value2) {
  FNV1A64(ByteMarker.String);
  for (let i = 0; i < value2.length; i++) {
    for (const byte of NumberToBytes(value2.charCodeAt(i))) {
      FNV1A64(byte);
    }
  }
}
function SymbolType(value2) {
  FNV1A64(ByteMarker.Symbol);
  Visit3(value2.description);
}
function Uint8ArrayType2(value2) {
  FNV1A64(ByteMarker.Uint8Array);
  for (let i = 0; i < value2.length; i++) {
    FNV1A64(value2[i]);
  }
}
function UndefinedType(value2) {
  return FNV1A64(ByteMarker.Undefined);
}
function Visit3(value2) {
  if (IsArray(value2))
    return ArrayType2(value2);
  if (IsBoolean(value2))
    return BooleanType(value2);
  if (IsBigInt(value2))
    return BigIntType(value2);
  if (IsDate(value2))
    return DateType2(value2);
  if (IsNull(value2))
    return NullType(value2);
  if (IsNumber(value2))
    return NumberType(value2);
  if (IsObject(value2))
    return ObjectType2(value2);
  if (IsString(value2))
    return StringType(value2);
  if (IsSymbol(value2))
    return SymbolType(value2);
  if (IsUint8Array(value2))
    return Uint8ArrayType2(value2);
  if (IsUndefined(value2))
    return UndefinedType(value2);
  throw new ValueHashError(value2);
}
function FNV1A64(byte) {
  Accumulator = Accumulator ^ Bytes[byte];
  Accumulator = Accumulator * Prime % Size;
}
function Hash(value2) {
  Accumulator = BigInt("14695981039346656037");
  Visit3(value2);
  return Accumulator;
}

// node_modules/@sinclair/typebox/build/esm/type/any/any.mjs
function Any(options) {
  return CreateType({ [Kind]: "Any" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/unknown/unknown.mjs
function Unknown(options) {
  return CreateType({ [Kind]: "Unknown" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/guard/type.mjs
var type_exports2 = {};
__export(type_exports2, {
  IsAny: () => IsAny2,
  IsArgument: () => IsArgument2,
  IsArray: () => IsArray4,
  IsAsyncIterator: () => IsAsyncIterator4,
  IsBigInt: () => IsBigInt4,
  IsBoolean: () => IsBoolean4,
  IsComputed: () => IsComputed2,
  IsConstructor: () => IsConstructor2,
  IsDate: () => IsDate4,
  IsFunction: () => IsFunction4,
  IsImport: () => IsImport,
  IsInteger: () => IsInteger3,
  IsIntersect: () => IsIntersect2,
  IsIterator: () => IsIterator4,
  IsKind: () => IsKind2,
  IsKindOf: () => IsKindOf2,
  IsLiteral: () => IsLiteral2,
  IsLiteralBoolean: () => IsLiteralBoolean,
  IsLiteralNumber: () => IsLiteralNumber,
  IsLiteralString: () => IsLiteralString,
  IsLiteralValue: () => IsLiteralValue2,
  IsMappedKey: () => IsMappedKey2,
  IsMappedResult: () => IsMappedResult2,
  IsNever: () => IsNever2,
  IsNot: () => IsNot2,
  IsNull: () => IsNull4,
  IsNumber: () => IsNumber4,
  IsObject: () => IsObject4,
  IsOptional: () => IsOptional2,
  IsPromise: () => IsPromise3,
  IsProperties: () => IsProperties,
  IsReadonly: () => IsReadonly2,
  IsRecord: () => IsRecord2,
  IsRecursive: () => IsRecursive,
  IsRef: () => IsRef2,
  IsRegExp: () => IsRegExp3,
  IsSchema: () => IsSchema2,
  IsString: () => IsString4,
  IsSymbol: () => IsSymbol4,
  IsTemplateLiteral: () => IsTemplateLiteral2,
  IsThis: () => IsThis2,
  IsTransform: () => IsTransform2,
  IsTuple: () => IsTuple2,
  IsUint8Array: () => IsUint8Array4,
  IsUndefined: () => IsUndefined4,
  IsUnion: () => IsUnion2,
  IsUnionLiteral: () => IsUnionLiteral,
  IsUnknown: () => IsUnknown2,
  IsUnsafe: () => IsUnsafe2,
  IsVoid: () => IsVoid2,
  TypeGuardUnknownTypeError: () => TypeGuardUnknownTypeError
});
var TypeGuardUnknownTypeError = class extends TypeBoxError {
};
var KnownTypes = [
  "Argument",
  "Any",
  "Array",
  "AsyncIterator",
  "BigInt",
  "Boolean",
  "Computed",
  "Constructor",
  "Date",
  "Enum",
  "Function",
  "Integer",
  "Intersect",
  "Iterator",
  "Literal",
  "MappedKey",
  "MappedResult",
  "Not",
  "Null",
  "Number",
  "Object",
  "Promise",
  "Record",
  "Ref",
  "RegExp",
  "String",
  "Symbol",
  "TemplateLiteral",
  "This",
  "Tuple",
  "Undefined",
  "Union",
  "Uint8Array",
  "Unknown",
  "Void"
];
function IsPattern(value2) {
  try {
    new RegExp(value2);
    return true;
  } catch {
    return false;
  }
}
function IsControlCharacterFree(value2) {
  if (!IsString2(value2))
    return false;
  for (let i = 0; i < value2.length; i++) {
    const code = value2.charCodeAt(i);
    if (code >= 7 && code <= 13 || code === 27 || code === 127) {
      return false;
    }
  }
  return true;
}
function IsAdditionalProperties(value2) {
  return IsOptionalBoolean(value2) || IsSchema2(value2);
}
function IsOptionalBigInt(value2) {
  return IsUndefined2(value2) || IsBigInt2(value2);
}
function IsOptionalNumber(value2) {
  return IsUndefined2(value2) || IsNumber2(value2);
}
function IsOptionalBoolean(value2) {
  return IsUndefined2(value2) || IsBoolean2(value2);
}
function IsOptionalString(value2) {
  return IsUndefined2(value2) || IsString2(value2);
}
function IsOptionalPattern(value2) {
  return IsUndefined2(value2) || IsString2(value2) && IsControlCharacterFree(value2) && IsPattern(value2);
}
function IsOptionalFormat(value2) {
  return IsUndefined2(value2) || IsString2(value2) && IsControlCharacterFree(value2);
}
function IsOptionalSchema(value2) {
  return IsUndefined2(value2) || IsSchema2(value2);
}
function IsReadonly2(value2) {
  return IsObject2(value2) && value2[ReadonlyKind] === "Readonly";
}
function IsOptional2(value2) {
  return IsObject2(value2) && value2[OptionalKind] === "Optional";
}
function IsAny2(value2) {
  return IsKindOf2(value2, "Any") && IsOptionalString(value2.$id);
}
function IsArgument2(value2) {
  return IsKindOf2(value2, "Argument") && IsNumber2(value2.index);
}
function IsArray4(value2) {
  return IsKindOf2(value2, "Array") && value2.type === "array" && IsOptionalString(value2.$id) && IsSchema2(value2.items) && IsOptionalNumber(value2.minItems) && IsOptionalNumber(value2.maxItems) && IsOptionalBoolean(value2.uniqueItems) && IsOptionalSchema(value2.contains) && IsOptionalNumber(value2.minContains) && IsOptionalNumber(value2.maxContains);
}
function IsAsyncIterator4(value2) {
  return IsKindOf2(value2, "AsyncIterator") && value2.type === "AsyncIterator" && IsOptionalString(value2.$id) && IsSchema2(value2.items);
}
function IsBigInt4(value2) {
  return IsKindOf2(value2, "BigInt") && value2.type === "bigint" && IsOptionalString(value2.$id) && IsOptionalBigInt(value2.exclusiveMaximum) && IsOptionalBigInt(value2.exclusiveMinimum) && IsOptionalBigInt(value2.maximum) && IsOptionalBigInt(value2.minimum) && IsOptionalBigInt(value2.multipleOf);
}
function IsBoolean4(value2) {
  return IsKindOf2(value2, "Boolean") && value2.type === "boolean" && IsOptionalString(value2.$id);
}
function IsComputed2(value2) {
  return IsKindOf2(value2, "Computed") && IsString2(value2.target) && IsArray2(value2.parameters) && value2.parameters.every((schema) => IsSchema2(schema));
}
function IsConstructor2(value2) {
  return IsKindOf2(value2, "Constructor") && value2.type === "Constructor" && IsOptionalString(value2.$id) && IsArray2(value2.parameters) && value2.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value2.returns);
}
function IsDate4(value2) {
  return IsKindOf2(value2, "Date") && value2.type === "Date" && IsOptionalString(value2.$id) && IsOptionalNumber(value2.exclusiveMaximumTimestamp) && IsOptionalNumber(value2.exclusiveMinimumTimestamp) && IsOptionalNumber(value2.maximumTimestamp) && IsOptionalNumber(value2.minimumTimestamp) && IsOptionalNumber(value2.multipleOfTimestamp);
}
function IsFunction4(value2) {
  return IsKindOf2(value2, "Function") && value2.type === "Function" && IsOptionalString(value2.$id) && IsArray2(value2.parameters) && value2.parameters.every((schema) => IsSchema2(schema)) && IsSchema2(value2.returns);
}
function IsImport(value2) {
  return IsKindOf2(value2, "Import") && HasPropertyKey2(value2, "$defs") && IsObject2(value2.$defs) && IsProperties(value2.$defs) && HasPropertyKey2(value2, "$ref") && IsString2(value2.$ref) && value2.$ref in value2.$defs;
}
function IsInteger3(value2) {
  return IsKindOf2(value2, "Integer") && value2.type === "integer" && IsOptionalString(value2.$id) && IsOptionalNumber(value2.exclusiveMaximum) && IsOptionalNumber(value2.exclusiveMinimum) && IsOptionalNumber(value2.maximum) && IsOptionalNumber(value2.minimum) && IsOptionalNumber(value2.multipleOf);
}
function IsProperties(value2) {
  return IsObject2(value2) && Object.entries(value2).every(([key, schema]) => IsControlCharacterFree(key) && IsSchema2(schema));
}
function IsIntersect2(value2) {
  return IsKindOf2(value2, "Intersect") && (IsString2(value2.type) && value2.type !== "object" ? false : true) && IsArray2(value2.allOf) && value2.allOf.every((schema) => IsSchema2(schema) && !IsTransform2(schema)) && IsOptionalString(value2.type) && (IsOptionalBoolean(value2.unevaluatedProperties) || IsOptionalSchema(value2.unevaluatedProperties)) && IsOptionalString(value2.$id);
}
function IsIterator4(value2) {
  return IsKindOf2(value2, "Iterator") && value2.type === "Iterator" && IsOptionalString(value2.$id) && IsSchema2(value2.items);
}
function IsKindOf2(value2, kind) {
  return IsObject2(value2) && Kind in value2 && value2[Kind] === kind;
}
function IsLiteralString(value2) {
  return IsLiteral2(value2) && IsString2(value2.const);
}
function IsLiteralNumber(value2) {
  return IsLiteral2(value2) && IsNumber2(value2.const);
}
function IsLiteralBoolean(value2) {
  return IsLiteral2(value2) && IsBoolean2(value2.const);
}
function IsLiteral2(value2) {
  return IsKindOf2(value2, "Literal") && IsOptionalString(value2.$id) && IsLiteralValue2(value2.const);
}
function IsLiteralValue2(value2) {
  return IsBoolean2(value2) || IsNumber2(value2) || IsString2(value2);
}
function IsMappedKey2(value2) {
  return IsKindOf2(value2, "MappedKey") && IsArray2(value2.keys) && value2.keys.every((key) => IsNumber2(key) || IsString2(key));
}
function IsMappedResult2(value2) {
  return IsKindOf2(value2, "MappedResult") && IsProperties(value2.properties);
}
function IsNever2(value2) {
  return IsKindOf2(value2, "Never") && IsObject2(value2.not) && Object.getOwnPropertyNames(value2.not).length === 0;
}
function IsNot2(value2) {
  return IsKindOf2(value2, "Not") && IsSchema2(value2.not);
}
function IsNull4(value2) {
  return IsKindOf2(value2, "Null") && value2.type === "null" && IsOptionalString(value2.$id);
}
function IsNumber4(value2) {
  return IsKindOf2(value2, "Number") && value2.type === "number" && IsOptionalString(value2.$id) && IsOptionalNumber(value2.exclusiveMaximum) && IsOptionalNumber(value2.exclusiveMinimum) && IsOptionalNumber(value2.maximum) && IsOptionalNumber(value2.minimum) && IsOptionalNumber(value2.multipleOf);
}
function IsObject4(value2) {
  return IsKindOf2(value2, "Object") && value2.type === "object" && IsOptionalString(value2.$id) && IsProperties(value2.properties) && IsAdditionalProperties(value2.additionalProperties) && IsOptionalNumber(value2.minProperties) && IsOptionalNumber(value2.maxProperties);
}
function IsPromise3(value2) {
  return IsKindOf2(value2, "Promise") && value2.type === "Promise" && IsOptionalString(value2.$id) && IsSchema2(value2.item);
}
function IsRecord2(value2) {
  return IsKindOf2(value2, "Record") && value2.type === "object" && IsOptionalString(value2.$id) && IsAdditionalProperties(value2.additionalProperties) && IsObject2(value2.patternProperties) && ((schema) => {
    const keys = Object.getOwnPropertyNames(schema.patternProperties);
    return keys.length === 1 && IsPattern(keys[0]) && IsObject2(schema.patternProperties) && IsSchema2(schema.patternProperties[keys[0]]);
  })(value2);
}
function IsRecursive(value2) {
  return IsObject2(value2) && Hint in value2 && value2[Hint] === "Recursive";
}
function IsRef2(value2) {
  return IsKindOf2(value2, "Ref") && IsOptionalString(value2.$id) && IsString2(value2.$ref);
}
function IsRegExp3(value2) {
  return IsKindOf2(value2, "RegExp") && IsOptionalString(value2.$id) && IsString2(value2.source) && IsString2(value2.flags) && IsOptionalNumber(value2.maxLength) && IsOptionalNumber(value2.minLength);
}
function IsString4(value2) {
  return IsKindOf2(value2, "String") && value2.type === "string" && IsOptionalString(value2.$id) && IsOptionalNumber(value2.minLength) && IsOptionalNumber(value2.maxLength) && IsOptionalPattern(value2.pattern) && IsOptionalFormat(value2.format);
}
function IsSymbol4(value2) {
  return IsKindOf2(value2, "Symbol") && value2.type === "symbol" && IsOptionalString(value2.$id);
}
function IsTemplateLiteral2(value2) {
  return IsKindOf2(value2, "TemplateLiteral") && value2.type === "string" && IsString2(value2.pattern) && value2.pattern[0] === "^" && value2.pattern[value2.pattern.length - 1] === "$";
}
function IsThis2(value2) {
  return IsKindOf2(value2, "This") && IsOptionalString(value2.$id) && IsString2(value2.$ref);
}
function IsTransform2(value2) {
  return IsObject2(value2) && TransformKind in value2;
}
function IsTuple2(value2) {
  return IsKindOf2(value2, "Tuple") && value2.type === "array" && IsOptionalString(value2.$id) && IsNumber2(value2.minItems) && IsNumber2(value2.maxItems) && value2.minItems === value2.maxItems && // empty
  (IsUndefined2(value2.items) && IsUndefined2(value2.additionalItems) && value2.minItems === 0 || IsArray2(value2.items) && value2.items.every((schema) => IsSchema2(schema)));
}
function IsUndefined4(value2) {
  return IsKindOf2(value2, "Undefined") && value2.type === "undefined" && IsOptionalString(value2.$id);
}
function IsUnionLiteral(value2) {
  return IsUnion2(value2) && value2.anyOf.every((schema) => IsLiteralString(schema) || IsLiteralNumber(schema));
}
function IsUnion2(value2) {
  return IsKindOf2(value2, "Union") && IsOptionalString(value2.$id) && IsObject2(value2) && IsArray2(value2.anyOf) && value2.anyOf.every((schema) => IsSchema2(schema));
}
function IsUint8Array4(value2) {
  return IsKindOf2(value2, "Uint8Array") && value2.type === "Uint8Array" && IsOptionalString(value2.$id) && IsOptionalNumber(value2.minByteLength) && IsOptionalNumber(value2.maxByteLength);
}
function IsUnknown2(value2) {
  return IsKindOf2(value2, "Unknown") && IsOptionalString(value2.$id);
}
function IsUnsafe2(value2) {
  return IsKindOf2(value2, "Unsafe");
}
function IsVoid2(value2) {
  return IsKindOf2(value2, "Void") && value2.type === "void" && IsOptionalString(value2.$id);
}
function IsKind2(value2) {
  return IsObject2(value2) && Kind in value2 && IsString2(value2[Kind]) && !KnownTypes.includes(value2[Kind]);
}
function IsSchema2(value2) {
  return IsObject2(value2) && (IsAny2(value2) || IsArgument2(value2) || IsArray4(value2) || IsBoolean4(value2) || IsBigInt4(value2) || IsAsyncIterator4(value2) || IsComputed2(value2) || IsConstructor2(value2) || IsDate4(value2) || IsFunction4(value2) || IsInteger3(value2) || IsIntersect2(value2) || IsIterator4(value2) || IsLiteral2(value2) || IsMappedKey2(value2) || IsMappedResult2(value2) || IsNever2(value2) || IsNot2(value2) || IsNull4(value2) || IsNumber4(value2) || IsObject4(value2) || IsPromise3(value2) || IsRecord2(value2) || IsRef2(value2) || IsRegExp3(value2) || IsString4(value2) || IsSymbol4(value2) || IsTemplateLiteral2(value2) || IsThis2(value2) || IsTuple2(value2) || IsUndefined4(value2) || IsUnion2(value2) || IsUint8Array4(value2) || IsUnknown2(value2) || IsUnsafe2(value2) || IsVoid2(value2) || IsKind2(value2));
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-check.mjs
var ExtendsResolverError = class extends TypeBoxError {
};
var ExtendsResult;
(function(ExtendsResult2) {
  ExtendsResult2[ExtendsResult2["Union"] = 0] = "Union";
  ExtendsResult2[ExtendsResult2["True"] = 1] = "True";
  ExtendsResult2[ExtendsResult2["False"] = 2] = "False";
})(ExtendsResult || (ExtendsResult = {}));
function IntoBooleanResult(result) {
  return result === ExtendsResult.False ? result : ExtendsResult.True;
}
function Throw(message) {
  throw new ExtendsResolverError(message);
}
function IsStructuralRight(right) {
  return type_exports2.IsNever(right) || type_exports2.IsIntersect(right) || type_exports2.IsUnion(right) || type_exports2.IsUnknown(right) || type_exports2.IsAny(right);
}
function StructuralRight(left, right) {
  return type_exports2.IsNever(right) ? FromNeverRight(left, right) : type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) ? FromUnionRight(left, right) : type_exports2.IsUnknown(right) ? FromUnknownRight(left, right) : type_exports2.IsAny(right) ? FromAnyRight(left, right) : Throw("StructuralRight");
}
function FromAnyRight(left, right) {
  return ExtendsResult.True;
}
function FromAny(left, right) {
  return type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) && right.anyOf.some((schema) => type_exports2.IsAny(schema) || type_exports2.IsUnknown(schema)) ? ExtendsResult.True : type_exports2.IsUnion(right) ? ExtendsResult.Union : type_exports2.IsUnknown(right) ? ExtendsResult.True : type_exports2.IsAny(right) ? ExtendsResult.True : ExtendsResult.Union;
}
function FromArrayRight(left, right) {
  return type_exports2.IsUnknown(left) ? ExtendsResult.False : type_exports2.IsAny(left) ? ExtendsResult.Union : type_exports2.IsNever(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromArray3(left, right) {
  return type_exports2.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports2.IsArray(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.items, right.items));
}
function FromAsyncIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports2.IsAsyncIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.items, right.items));
}
function FromBigInt(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsBigInt(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBooleanRight(left, right) {
  return type_exports2.IsLiteralBoolean(left) ? ExtendsResult.True : type_exports2.IsBoolean(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromBoolean(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsBoolean(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromConstructor(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : !type_exports2.IsConstructor(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit4(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.returns, right.returns));
}
function FromDate(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsDate(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromFunction(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : !type_exports2.IsFunction(right) ? ExtendsResult.False : left.parameters.length > right.parameters.length ? ExtendsResult.False : !left.parameters.every((schema, index) => IntoBooleanResult(Visit4(right.parameters[index], schema)) === ExtendsResult.True) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.returns, right.returns));
}
function FromIntegerRight(left, right) {
  return type_exports2.IsLiteral(left) && value_exports.IsNumber(left.const) ? ExtendsResult.True : type_exports2.IsNumber(left) || type_exports2.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromInteger(left, right) {
  return type_exports2.IsInteger(right) || type_exports2.IsNumber(right) ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : ExtendsResult.False;
}
function FromIntersectRight(left, right) {
  return right.allOf.every((schema) => Visit4(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIntersect3(left, right) {
  return left.allOf.some((schema) => Visit4(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromIterator(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : !type_exports2.IsIterator(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.items, right.items));
}
function FromLiteral2(left, right) {
  return type_exports2.IsLiteral(right) && right.const === left.const ? ExtendsResult.True : IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsString(right) ? FromStringRight(left, right) : type_exports2.IsNumber(right) ? FromNumberRight(left, right) : type_exports2.IsInteger(right) ? FromIntegerRight(left, right) : type_exports2.IsBoolean(right) ? FromBooleanRight(left, right) : ExtendsResult.False;
}
function FromNeverRight(left, right) {
  return ExtendsResult.False;
}
function FromNever(left, right) {
  return ExtendsResult.True;
}
function UnwrapTNot(schema) {
  let [current, depth] = [schema, 0];
  while (true) {
    if (!type_exports2.IsNot(current))
      break;
    current = current.not;
    depth += 1;
  }
  return depth % 2 === 0 ? current : Unknown();
}
function FromNot(left, right) {
  return type_exports2.IsNot(left) ? Visit4(UnwrapTNot(left), right) : type_exports2.IsNot(right) ? Visit4(left, UnwrapTNot(right)) : Throw("Invalid fallthrough for Not");
}
function FromNull(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsNull(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumberRight(left, right) {
  return type_exports2.IsLiteralNumber(left) ? ExtendsResult.True : type_exports2.IsNumber(left) || type_exports2.IsInteger(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromNumber(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsInteger(right) || type_exports2.IsNumber(right) ? ExtendsResult.True : ExtendsResult.False;
}
function IsObjectPropertyCount(schema, count) {
  return Object.getOwnPropertyNames(schema.properties).length === count;
}
function IsObjectStringLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectSymbolLike(schema) {
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "description" in schema.properties && type_exports2.IsUnion(schema.properties.description) && schema.properties.description.anyOf.length === 2 && (type_exports2.IsString(schema.properties.description.anyOf[0]) && type_exports2.IsUndefined(schema.properties.description.anyOf[1]) || type_exports2.IsString(schema.properties.description.anyOf[1]) && type_exports2.IsUndefined(schema.properties.description.anyOf[0]));
}
function IsObjectNumberLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBooleanLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectBigIntLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectDateLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectUint8ArrayLike(schema) {
  return IsObjectArrayLike(schema);
}
function IsObjectFunctionLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit4(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectConstructorLike(schema) {
  return IsObjectPropertyCount(schema, 0);
}
function IsObjectArrayLike(schema) {
  const length = Number2();
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "length" in schema.properties && IntoBooleanResult(Visit4(schema.properties["length"], length)) === ExtendsResult.True;
}
function IsObjectPromiseLike(schema) {
  const then = Function([Any()], Any());
  return IsObjectPropertyCount(schema, 0) || IsObjectPropertyCount(schema, 1) && "then" in schema.properties && IntoBooleanResult(Visit4(schema.properties["then"], then)) === ExtendsResult.True;
}
function Property(left, right) {
  return Visit4(left, right) === ExtendsResult.False ? ExtendsResult.False : type_exports2.IsOptional(left) && !type_exports2.IsOptional(right) ? ExtendsResult.False : ExtendsResult.True;
}
function FromObjectRight(left, right) {
  return type_exports2.IsUnknown(left) ? ExtendsResult.False : type_exports2.IsAny(left) ? ExtendsResult.Union : type_exports2.IsNever(left) || type_exports2.IsLiteralString(left) && IsObjectStringLike(right) || type_exports2.IsLiteralNumber(left) && IsObjectNumberLike(right) || type_exports2.IsLiteralBoolean(left) && IsObjectBooleanLike(right) || type_exports2.IsSymbol(left) && IsObjectSymbolLike(right) || type_exports2.IsBigInt(left) && IsObjectBigIntLike(right) || type_exports2.IsString(left) && IsObjectStringLike(right) || type_exports2.IsSymbol(left) && IsObjectSymbolLike(right) || type_exports2.IsNumber(left) && IsObjectNumberLike(right) || type_exports2.IsInteger(left) && IsObjectNumberLike(right) || type_exports2.IsBoolean(left) && IsObjectBooleanLike(right) || type_exports2.IsUint8Array(left) && IsObjectUint8ArrayLike(right) || type_exports2.IsDate(left) && IsObjectDateLike(right) || type_exports2.IsConstructor(left) && IsObjectConstructorLike(right) || type_exports2.IsFunction(left) && IsObjectFunctionLike(right) ? ExtendsResult.True : type_exports2.IsRecord(left) && type_exports2.IsString(RecordKey(left)) ? (() => {
    return right[Hint] === "Record" ? ExtendsResult.True : ExtendsResult.False;
  })() : type_exports2.IsRecord(left) && type_exports2.IsNumber(RecordKey(left)) ? (() => {
    return IsObjectPropertyCount(right, 0) ? ExtendsResult.True : ExtendsResult.False;
  })() : ExtendsResult.False;
}
function FromObject(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : !type_exports2.IsObject(right) ? ExtendsResult.False : (() => {
    for (const key of Object.getOwnPropertyNames(right.properties)) {
      if (!(key in left.properties) && !type_exports2.IsOptional(right.properties[key])) {
        return ExtendsResult.False;
      }
      if (type_exports2.IsOptional(right.properties[key])) {
        return ExtendsResult.True;
      }
      if (Property(left.properties[key], right.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })();
}
function FromPromise(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) && IsObjectPromiseLike(right) ? ExtendsResult.True : !type_exports2.IsPromise(right) ? ExtendsResult.False : IntoBooleanResult(Visit4(left.item, right.item));
}
function RecordKey(schema) {
  return PatternNumberExact in schema.patternProperties ? Number2() : PatternStringExact in schema.patternProperties ? String2() : Throw("Unknown record key pattern");
}
function RecordValue(schema) {
  return PatternNumberExact in schema.patternProperties ? schema.patternProperties[PatternNumberExact] : PatternStringExact in schema.patternProperties ? schema.patternProperties[PatternStringExact] : Throw("Unable to get record value schema");
}
function FromRecordRight(left, right) {
  const [Key, Value] = [RecordKey(right), RecordValue(right)];
  return type_exports2.IsLiteralString(left) && type_exports2.IsNumber(Key) && IntoBooleanResult(Visit4(left, Value)) === ExtendsResult.True ? ExtendsResult.True : type_exports2.IsUint8Array(left) && type_exports2.IsNumber(Key) ? Visit4(left, Value) : type_exports2.IsString(left) && type_exports2.IsNumber(Key) ? Visit4(left, Value) : type_exports2.IsArray(left) && type_exports2.IsNumber(Key) ? Visit4(left, Value) : type_exports2.IsObject(left) ? (() => {
    for (const key of Object.getOwnPropertyNames(left.properties)) {
      if (Property(Value, left.properties[key]) === ExtendsResult.False) {
        return ExtendsResult.False;
      }
    }
    return ExtendsResult.True;
  })() : ExtendsResult.False;
}
function FromRecord(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : !type_exports2.IsRecord(right) ? ExtendsResult.False : Visit4(RecordValue(left), RecordValue(right));
}
function FromRegExp(left, right) {
  const L = type_exports2.IsRegExp(left) ? String2() : left;
  const R = type_exports2.IsRegExp(right) ? String2() : right;
  return Visit4(L, R);
}
function FromStringRight(left, right) {
  return type_exports2.IsLiteral(left) && value_exports.IsString(left.const) ? ExtendsResult.True : type_exports2.IsString(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromString(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsString(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromSymbol(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsSymbol(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromTemplateLiteral2(left, right) {
  return type_exports2.IsTemplateLiteral(left) ? Visit4(TemplateLiteralToUnion(left), right) : type_exports2.IsTemplateLiteral(right) ? Visit4(left, TemplateLiteralToUnion(right)) : Throw("Invalid fallthrough for TemplateLiteral");
}
function IsArrayOfTuple(left, right) {
  return type_exports2.IsArray(right) && left.items !== void 0 && left.items.every((schema) => Visit4(schema, right.items) === ExtendsResult.True);
}
function FromTupleRight(left, right) {
  return type_exports2.IsNever(left) ? ExtendsResult.True : type_exports2.IsUnknown(left) ? ExtendsResult.False : type_exports2.IsAny(left) ? ExtendsResult.Union : ExtendsResult.False;
}
function FromTuple3(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) && IsObjectArrayLike(right) ? ExtendsResult.True : type_exports2.IsArray(right) && IsArrayOfTuple(left, right) ? ExtendsResult.True : !type_exports2.IsTuple(right) ? ExtendsResult.False : value_exports.IsUndefined(left.items) && !value_exports.IsUndefined(right.items) || !value_exports.IsUndefined(left.items) && value_exports.IsUndefined(right.items) ? ExtendsResult.False : value_exports.IsUndefined(left.items) && !value_exports.IsUndefined(right.items) ? ExtendsResult.True : left.items.every((schema, index) => Visit4(schema, right.items[index]) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUint8Array(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsUint8Array(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUndefined(left, right) {
  return IsStructuralRight(right) ? StructuralRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsRecord(right) ? FromRecordRight(left, right) : type_exports2.IsVoid(right) ? FromVoidRight(left, right) : type_exports2.IsUndefined(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnionRight(left, right) {
  return right.anyOf.some((schema) => Visit4(left, schema) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnion5(left, right) {
  return left.anyOf.every((schema) => Visit4(schema, right) === ExtendsResult.True) ? ExtendsResult.True : ExtendsResult.False;
}
function FromUnknownRight(left, right) {
  return ExtendsResult.True;
}
function FromUnknown(left, right) {
  return type_exports2.IsNever(right) ? FromNeverRight(left, right) : type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) ? FromUnionRight(left, right) : type_exports2.IsAny(right) ? FromAnyRight(left, right) : type_exports2.IsString(right) ? FromStringRight(left, right) : type_exports2.IsNumber(right) ? FromNumberRight(left, right) : type_exports2.IsInteger(right) ? FromIntegerRight(left, right) : type_exports2.IsBoolean(right) ? FromBooleanRight(left, right) : type_exports2.IsArray(right) ? FromArrayRight(left, right) : type_exports2.IsTuple(right) ? FromTupleRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsUnknown(right) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoidRight(left, right) {
  return type_exports2.IsUndefined(left) ? ExtendsResult.True : type_exports2.IsUndefined(left) ? ExtendsResult.True : ExtendsResult.False;
}
function FromVoid(left, right) {
  return type_exports2.IsIntersect(right) ? FromIntersectRight(left, right) : type_exports2.IsUnion(right) ? FromUnionRight(left, right) : type_exports2.IsUnknown(right) ? FromUnknownRight(left, right) : type_exports2.IsAny(right) ? FromAnyRight(left, right) : type_exports2.IsObject(right) ? FromObjectRight(left, right) : type_exports2.IsVoid(right) ? ExtendsResult.True : ExtendsResult.False;
}
function Visit4(left, right) {
  return (
    // resolvable
    type_exports2.IsTemplateLiteral(left) || type_exports2.IsTemplateLiteral(right) ? FromTemplateLiteral2(left, right) : type_exports2.IsRegExp(left) || type_exports2.IsRegExp(right) ? FromRegExp(left, right) : type_exports2.IsNot(left) || type_exports2.IsNot(right) ? FromNot(left, right) : (
      // standard
      type_exports2.IsAny(left) ? FromAny(left, right) : type_exports2.IsArray(left) ? FromArray3(left, right) : type_exports2.IsBigInt(left) ? FromBigInt(left, right) : type_exports2.IsBoolean(left) ? FromBoolean(left, right) : type_exports2.IsAsyncIterator(left) ? FromAsyncIterator(left, right) : type_exports2.IsConstructor(left) ? FromConstructor(left, right) : type_exports2.IsDate(left) ? FromDate(left, right) : type_exports2.IsFunction(left) ? FromFunction(left, right) : type_exports2.IsInteger(left) ? FromInteger(left, right) : type_exports2.IsIntersect(left) ? FromIntersect3(left, right) : type_exports2.IsIterator(left) ? FromIterator(left, right) : type_exports2.IsLiteral(left) ? FromLiteral2(left, right) : type_exports2.IsNever(left) ? FromNever(left, right) : type_exports2.IsNull(left) ? FromNull(left, right) : type_exports2.IsNumber(left) ? FromNumber(left, right) : type_exports2.IsObject(left) ? FromObject(left, right) : type_exports2.IsRecord(left) ? FromRecord(left, right) : type_exports2.IsString(left) ? FromString(left, right) : type_exports2.IsSymbol(left) ? FromSymbol(left, right) : type_exports2.IsTuple(left) ? FromTuple3(left, right) : type_exports2.IsPromise(left) ? FromPromise(left, right) : type_exports2.IsUint8Array(left) ? FromUint8Array(left, right) : type_exports2.IsUndefined(left) ? FromUndefined(left, right) : type_exports2.IsUnion(left) ? FromUnion5(left, right) : type_exports2.IsUnknown(left) ? FromUnknown(left, right) : type_exports2.IsVoid(left) ? FromVoid(left, right) : Throw(`Unknown left type operand '${left[Kind]}'`)
    )
  );
}
function ExtendsCheck(left, right) {
  return Visit4(left, right);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-result.mjs
function FromProperties7(P, Right, True, False, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Extends(P[K2], Right, True, False, Clone(options));
  return Acc;
}
function FromMappedResult6(Left, Right, True, False, options) {
  return FromProperties7(Left.properties, Right, True, False, options);
}
function ExtendsFromMappedResult(Left, Right, True, False, options) {
  const P = FromMappedResult6(Left, Right, True, False, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends.mjs
function ExtendsResolve(left, right, trueType, falseType) {
  const R = ExtendsCheck(left, right);
  return R === ExtendsResult.Union ? Union([trueType, falseType]) : R === ExtendsResult.True ? trueType : falseType;
}
function Extends(L, R, T, F, options) {
  return IsMappedResult(L) ? ExtendsFromMappedResult(L, R, T, F, options) : IsMappedKey(L) ? CreateType(ExtendsFromMappedKey(L, R, T, F, options)) : CreateType(ExtendsResolve(L, R, T, F), options);
}

// node_modules/@sinclair/typebox/build/esm/type/extends/extends-from-mapped-key.mjs
function FromPropertyKey(K, U, L, R, options) {
  return {
    [K]: Extends(Literal(K), U, L, R, Clone(options))
  };
}
function FromPropertyKeys(K, U, L, R, options) {
  return K.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey(LK, U, L, R, options) };
  }, {});
}
function FromMappedKey2(K, U, L, R, options) {
  return FromPropertyKeys(K.keys, U, L, R, options);
}
function ExtendsFromMappedKey(T, U, L, R, options) {
  const P = FromMappedKey2(T, U, L, R, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/value/check/check.mjs
var ValueCheckUnknownTypeError = class extends TypeBoxError {
  constructor(schema) {
    super(`Unknown type`);
    this.schema = schema;
  }
};
function IsAnyOrUnknown(schema) {
  return schema[Kind] === "Any" || schema[Kind] === "Unknown";
}
function IsDefined(value2) {
  return value2 !== void 0;
}
function FromAny2(schema, references, value2) {
  return true;
}
function FromArgument(schema, references, value2) {
  return true;
}
function FromArray4(schema, references, value2) {
  if (!IsArray(value2))
    return false;
  if (IsDefined(schema.minItems) && !(value2.length >= schema.minItems)) {
    return false;
  }
  if (IsDefined(schema.maxItems) && !(value2.length <= schema.maxItems)) {
    return false;
  }
  for (const element of value2) {
    if (!Visit5(schema.items, references, element))
      return false;
  }
  if (schema.uniqueItems === true && !(function() {
    const set = /* @__PURE__ */ new Set();
    for (const element of value2) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  })()) {
    return false;
  }
  if (!(IsDefined(schema.contains) || IsNumber(schema.minContains) || IsNumber(schema.maxContains))) {
    return true;
  }
  const containsSchema = IsDefined(schema.contains) ? schema.contains : Never();
  const containsCount = value2.reduce((acc, value3) => Visit5(containsSchema, references, value3) ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    return false;
  }
  if (IsNumber(schema.minContains) && containsCount < schema.minContains) {
    return false;
  }
  if (IsNumber(schema.maxContains) && containsCount > schema.maxContains) {
    return false;
  }
  return true;
}
function FromAsyncIterator2(schema, references, value2) {
  return IsAsyncIterator(value2);
}
function FromBigInt2(schema, references, value2) {
  if (!IsBigInt(value2))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value2 < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value2 > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value2 <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value2 >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value2 % schema.multipleOf === BigInt(0))) {
    return false;
  }
  return true;
}
function FromBoolean2(schema, references, value2) {
  return IsBoolean(value2);
}
function FromConstructor2(schema, references, value2) {
  return Visit5(schema.returns, references, value2.prototype);
}
function FromDate2(schema, references, value2) {
  if (!IsDate(value2))
    return false;
  if (IsDefined(schema.exclusiveMaximumTimestamp) && !(value2.getTime() < schema.exclusiveMaximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimumTimestamp) && !(value2.getTime() > schema.exclusiveMinimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.maximumTimestamp) && !(value2.getTime() <= schema.maximumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.minimumTimestamp) && !(value2.getTime() >= schema.minimumTimestamp)) {
    return false;
  }
  if (IsDefined(schema.multipleOfTimestamp) && !(value2.getTime() % schema.multipleOfTimestamp === 0)) {
    return false;
  }
  return true;
}
function FromFunction2(schema, references, value2) {
  return IsFunction(value2);
}
function FromImport(schema, references, value2) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit5(target, [...references, ...definitions], value2);
}
function FromInteger2(schema, references, value2) {
  if (!IsInteger(value2)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMaximum) && !(value2 < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value2 > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value2 <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value2 >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value2 % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromIntersect4(schema, references, value2) {
  const check1 = schema.allOf.every((schema2) => Visit5(schema2, references, value2));
  if (schema.unevaluatedProperties === false) {
    const keyPattern = new RegExp(KeyOfPattern(schema));
    const check2 = Object.getOwnPropertyNames(value2).every((key) => keyPattern.test(key));
    return check1 && check2;
  } else if (IsSchema(schema.unevaluatedProperties)) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    const check2 = Object.getOwnPropertyNames(value2).every((key) => keyCheck.test(key) || Visit5(schema.unevaluatedProperties, references, value2[key]));
    return check1 && check2;
  } else {
    return check1;
  }
}
function FromIterator2(schema, references, value2) {
  return IsIterator(value2);
}
function FromLiteral3(schema, references, value2) {
  return value2 === schema.const;
}
function FromNever2(schema, references, value2) {
  return false;
}
function FromNot2(schema, references, value2) {
  return !Visit5(schema.not, references, value2);
}
function FromNull2(schema, references, value2) {
  return IsNull(value2);
}
function FromNumber2(schema, references, value2) {
  if (!TypeSystemPolicy.IsNumberLike(value2))
    return false;
  if (IsDefined(schema.exclusiveMaximum) && !(value2 < schema.exclusiveMaximum)) {
    return false;
  }
  if (IsDefined(schema.exclusiveMinimum) && !(value2 > schema.exclusiveMinimum)) {
    return false;
  }
  if (IsDefined(schema.minimum) && !(value2 >= schema.minimum)) {
    return false;
  }
  if (IsDefined(schema.maximum) && !(value2 <= schema.maximum)) {
    return false;
  }
  if (IsDefined(schema.multipleOf) && !(value2 % schema.multipleOf === 0)) {
    return false;
  }
  return true;
}
function FromObject2(schema, references, value2) {
  if (!TypeSystemPolicy.IsObjectLike(value2))
    return false;
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value2).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value2).length <= schema.maxProperties)) {
    return false;
  }
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      if (!Visit5(property, references, value2[knownKey])) {
        return false;
      }
      if ((ExtendsUndefinedCheck(property) || IsAnyOrUnknown(property)) && !(knownKey in value2)) {
        return false;
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value2, knownKey) && !Visit5(property, references, value2[knownKey])) {
        return false;
      }
    }
  }
  if (schema.additionalProperties === false) {
    const valueKeys = Object.getOwnPropertyNames(value2);
    if (schema.required && schema.required.length === knownKeys.length && valueKeys.length === knownKeys.length) {
      return true;
    } else {
      return valueKeys.every((valueKey) => knownKeys.includes(valueKey));
    }
  } else if (typeof schema.additionalProperties === "object") {
    const valueKeys = Object.getOwnPropertyNames(value2);
    return valueKeys.every((key) => knownKeys.includes(key) || Visit5(schema.additionalProperties, references, value2[key]));
  } else {
    return true;
  }
}
function FromPromise2(schema, references, value2) {
  return IsPromise(value2);
}
function FromRecord2(schema, references, value2) {
  if (!TypeSystemPolicy.IsRecordLike(value2)) {
    return false;
  }
  if (IsDefined(schema.minProperties) && !(Object.getOwnPropertyNames(value2).length >= schema.minProperties)) {
    return false;
  }
  if (IsDefined(schema.maxProperties) && !(Object.getOwnPropertyNames(value2).length <= schema.maxProperties)) {
    return false;
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  const check1 = Object.entries(value2).every(([key, value3]) => {
    return regex.test(key) ? Visit5(patternSchema, references, value3) : true;
  });
  const check2 = typeof schema.additionalProperties === "object" ? Object.entries(value2).every(([key, value3]) => {
    return !regex.test(key) ? Visit5(schema.additionalProperties, references, value3) : true;
  }) : true;
  const check3 = schema.additionalProperties === false ? Object.getOwnPropertyNames(value2).every((key) => {
    return regex.test(key);
  }) : true;
  return check1 && check2 && check3;
}
function FromRef2(schema, references, value2) {
  return Visit5(Deref(schema, references), references, value2);
}
function FromRegExp2(schema, references, value2) {
  const regex = new RegExp(schema.source, schema.flags);
  if (IsDefined(schema.minLength)) {
    if (!(value2.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value2.length <= schema.maxLength))
      return false;
  }
  return regex.test(value2);
}
function FromString2(schema, references, value2) {
  if (!IsString(value2)) {
    return false;
  }
  if (IsDefined(schema.minLength)) {
    if (!(value2.length >= schema.minLength))
      return false;
  }
  if (IsDefined(schema.maxLength)) {
    if (!(value2.length <= schema.maxLength))
      return false;
  }
  if (IsDefined(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value2))
      return false;
  }
  if (IsDefined(schema.format)) {
    if (!format_exports.Has(schema.format))
      return false;
    const func = format_exports.Get(schema.format);
    return func(value2);
  }
  return true;
}
function FromSymbol2(schema, references, value2) {
  return IsSymbol(value2);
}
function FromTemplateLiteral3(schema, references, value2) {
  return IsString(value2) && new RegExp(schema.pattern).test(value2);
}
function FromThis(schema, references, value2) {
  return Visit5(Deref(schema, references), references, value2);
}
function FromTuple4(schema, references, value2) {
  if (!IsArray(value2)) {
    return false;
  }
  if (schema.items === void 0 && !(value2.length === 0)) {
    return false;
  }
  if (!(value2.length === schema.maxItems)) {
    return false;
  }
  if (!schema.items) {
    return true;
  }
  for (let i = 0; i < schema.items.length; i++) {
    if (!Visit5(schema.items[i], references, value2[i]))
      return false;
  }
  return true;
}
function FromUndefined2(schema, references, value2) {
  return IsUndefined(value2);
}
function FromUnion6(schema, references, value2) {
  return schema.anyOf.some((inner) => Visit5(inner, references, value2));
}
function FromUint8Array2(schema, references, value2) {
  if (!IsUint8Array(value2)) {
    return false;
  }
  if (IsDefined(schema.maxByteLength) && !(value2.length <= schema.maxByteLength)) {
    return false;
  }
  if (IsDefined(schema.minByteLength) && !(value2.length >= schema.minByteLength)) {
    return false;
  }
  return true;
}
function FromUnknown2(schema, references, value2) {
  return true;
}
function FromVoid2(schema, references, value2) {
  return TypeSystemPolicy.IsVoidLike(value2);
}
function FromKind(schema, references, value2) {
  if (!type_exports.Has(schema[Kind]))
    return false;
  const func = type_exports.Get(schema[Kind]);
  return func(schema, value2);
}
function Visit5(schema, references, value2) {
  const references_ = IsDefined(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny2(schema_, references_, value2);
    case "Argument":
      return FromArgument(schema_, references_, value2);
    case "Array":
      return FromArray4(schema_, references_, value2);
    case "AsyncIterator":
      return FromAsyncIterator2(schema_, references_, value2);
    case "BigInt":
      return FromBigInt2(schema_, references_, value2);
    case "Boolean":
      return FromBoolean2(schema_, references_, value2);
    case "Constructor":
      return FromConstructor2(schema_, references_, value2);
    case "Date":
      return FromDate2(schema_, references_, value2);
    case "Function":
      return FromFunction2(schema_, references_, value2);
    case "Import":
      return FromImport(schema_, references_, value2);
    case "Integer":
      return FromInteger2(schema_, references_, value2);
    case "Intersect":
      return FromIntersect4(schema_, references_, value2);
    case "Iterator":
      return FromIterator2(schema_, references_, value2);
    case "Literal":
      return FromLiteral3(schema_, references_, value2);
    case "Never":
      return FromNever2(schema_, references_, value2);
    case "Not":
      return FromNot2(schema_, references_, value2);
    case "Null":
      return FromNull2(schema_, references_, value2);
    case "Number":
      return FromNumber2(schema_, references_, value2);
    case "Object":
      return FromObject2(schema_, references_, value2);
    case "Promise":
      return FromPromise2(schema_, references_, value2);
    case "Record":
      return FromRecord2(schema_, references_, value2);
    case "Ref":
      return FromRef2(schema_, references_, value2);
    case "RegExp":
      return FromRegExp2(schema_, references_, value2);
    case "String":
      return FromString2(schema_, references_, value2);
    case "Symbol":
      return FromSymbol2(schema_, references_, value2);
    case "TemplateLiteral":
      return FromTemplateLiteral3(schema_, references_, value2);
    case "This":
      return FromThis(schema_, references_, value2);
    case "Tuple":
      return FromTuple4(schema_, references_, value2);
    case "Undefined":
      return FromUndefined2(schema_, references_, value2);
    case "Union":
      return FromUnion6(schema_, references_, value2);
    case "Uint8Array":
      return FromUint8Array2(schema_, references_, value2);
    case "Unknown":
      return FromUnknown2(schema_, references_, value2);
    case "Void":
      return FromVoid2(schema_, references_, value2);
    default:
      if (!type_exports.Has(schema_[Kind]))
        throw new ValueCheckUnknownTypeError(schema_);
      return FromKind(schema_, references_, value2);
  }
}
function Check(...args) {
  return args.length === 3 ? Visit5(args[0], args[1], args[2]) : Visit5(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/errors/errors.mjs
var ValueErrorType;
(function(ValueErrorType2) {
  ValueErrorType2[ValueErrorType2["ArrayContains"] = 0] = "ArrayContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxContains"] = 1] = "ArrayMaxContains";
  ValueErrorType2[ValueErrorType2["ArrayMaxItems"] = 2] = "ArrayMaxItems";
  ValueErrorType2[ValueErrorType2["ArrayMinContains"] = 3] = "ArrayMinContains";
  ValueErrorType2[ValueErrorType2["ArrayMinItems"] = 4] = "ArrayMinItems";
  ValueErrorType2[ValueErrorType2["ArrayUniqueItems"] = 5] = "ArrayUniqueItems";
  ValueErrorType2[ValueErrorType2["Array"] = 6] = "Array";
  ValueErrorType2[ValueErrorType2["AsyncIterator"] = 7] = "AsyncIterator";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMaximum"] = 8] = "BigIntExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["BigIntExclusiveMinimum"] = 9] = "BigIntExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMaximum"] = 10] = "BigIntMaximum";
  ValueErrorType2[ValueErrorType2["BigIntMinimum"] = 11] = "BigIntMinimum";
  ValueErrorType2[ValueErrorType2["BigIntMultipleOf"] = 12] = "BigIntMultipleOf";
  ValueErrorType2[ValueErrorType2["BigInt"] = 13] = "BigInt";
  ValueErrorType2[ValueErrorType2["Boolean"] = 14] = "Boolean";
  ValueErrorType2[ValueErrorType2["DateExclusiveMaximumTimestamp"] = 15] = "DateExclusiveMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateExclusiveMinimumTimestamp"] = 16] = "DateExclusiveMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMaximumTimestamp"] = 17] = "DateMaximumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMinimumTimestamp"] = 18] = "DateMinimumTimestamp";
  ValueErrorType2[ValueErrorType2["DateMultipleOfTimestamp"] = 19] = "DateMultipleOfTimestamp";
  ValueErrorType2[ValueErrorType2["Date"] = 20] = "Date";
  ValueErrorType2[ValueErrorType2["Function"] = 21] = "Function";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMaximum"] = 22] = "IntegerExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["IntegerExclusiveMinimum"] = 23] = "IntegerExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMaximum"] = 24] = "IntegerMaximum";
  ValueErrorType2[ValueErrorType2["IntegerMinimum"] = 25] = "IntegerMinimum";
  ValueErrorType2[ValueErrorType2["IntegerMultipleOf"] = 26] = "IntegerMultipleOf";
  ValueErrorType2[ValueErrorType2["Integer"] = 27] = "Integer";
  ValueErrorType2[ValueErrorType2["IntersectUnevaluatedProperties"] = 28] = "IntersectUnevaluatedProperties";
  ValueErrorType2[ValueErrorType2["Intersect"] = 29] = "Intersect";
  ValueErrorType2[ValueErrorType2["Iterator"] = 30] = "Iterator";
  ValueErrorType2[ValueErrorType2["Kind"] = 31] = "Kind";
  ValueErrorType2[ValueErrorType2["Literal"] = 32] = "Literal";
  ValueErrorType2[ValueErrorType2["Never"] = 33] = "Never";
  ValueErrorType2[ValueErrorType2["Not"] = 34] = "Not";
  ValueErrorType2[ValueErrorType2["Null"] = 35] = "Null";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMaximum"] = 36] = "NumberExclusiveMaximum";
  ValueErrorType2[ValueErrorType2["NumberExclusiveMinimum"] = 37] = "NumberExclusiveMinimum";
  ValueErrorType2[ValueErrorType2["NumberMaximum"] = 38] = "NumberMaximum";
  ValueErrorType2[ValueErrorType2["NumberMinimum"] = 39] = "NumberMinimum";
  ValueErrorType2[ValueErrorType2["NumberMultipleOf"] = 40] = "NumberMultipleOf";
  ValueErrorType2[ValueErrorType2["Number"] = 41] = "Number";
  ValueErrorType2[ValueErrorType2["ObjectAdditionalProperties"] = 42] = "ObjectAdditionalProperties";
  ValueErrorType2[ValueErrorType2["ObjectMaxProperties"] = 43] = "ObjectMaxProperties";
  ValueErrorType2[ValueErrorType2["ObjectMinProperties"] = 44] = "ObjectMinProperties";
  ValueErrorType2[ValueErrorType2["ObjectRequiredProperty"] = 45] = "ObjectRequiredProperty";
  ValueErrorType2[ValueErrorType2["Object"] = 46] = "Object";
  ValueErrorType2[ValueErrorType2["Promise"] = 47] = "Promise";
  ValueErrorType2[ValueErrorType2["RegExp"] = 48] = "RegExp";
  ValueErrorType2[ValueErrorType2["StringFormatUnknown"] = 49] = "StringFormatUnknown";
  ValueErrorType2[ValueErrorType2["StringFormat"] = 50] = "StringFormat";
  ValueErrorType2[ValueErrorType2["StringMaxLength"] = 51] = "StringMaxLength";
  ValueErrorType2[ValueErrorType2["StringMinLength"] = 52] = "StringMinLength";
  ValueErrorType2[ValueErrorType2["StringPattern"] = 53] = "StringPattern";
  ValueErrorType2[ValueErrorType2["String"] = 54] = "String";
  ValueErrorType2[ValueErrorType2["Symbol"] = 55] = "Symbol";
  ValueErrorType2[ValueErrorType2["TupleLength"] = 56] = "TupleLength";
  ValueErrorType2[ValueErrorType2["Tuple"] = 57] = "Tuple";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMaxByteLength"] = 58] = "Uint8ArrayMaxByteLength";
  ValueErrorType2[ValueErrorType2["Uint8ArrayMinByteLength"] = 59] = "Uint8ArrayMinByteLength";
  ValueErrorType2[ValueErrorType2["Uint8Array"] = 60] = "Uint8Array";
  ValueErrorType2[ValueErrorType2["Undefined"] = 61] = "Undefined";
  ValueErrorType2[ValueErrorType2["Union"] = 62] = "Union";
  ValueErrorType2[ValueErrorType2["Void"] = 63] = "Void";
})(ValueErrorType || (ValueErrorType = {}));
var ValueErrorsUnknownTypeError = class extends TypeBoxError {
  constructor(schema) {
    super("Unknown type");
    this.schema = schema;
  }
};
function EscapeKey(key) {
  return key.replace(/~/g, "~0").replace(/\//g, "~1");
}
function IsDefined2(value2) {
  return value2 !== void 0;
}
var ValueErrorIterator = class {
  constructor(iterator) {
    this.iterator = iterator;
  }
  [Symbol.iterator]() {
    return this.iterator;
  }
  /** Returns the first value error or undefined if no errors */
  First() {
    const next = this.iterator.next();
    return next.done ? void 0 : next.value;
  }
};
function Create(errorType, schema, path4, value2, errors = []) {
  return {
    type: errorType,
    schema,
    path: path4,
    value: value2,
    message: GetErrorFunction()({ errorType, path: path4, schema, value: value2, errors }),
    errors
  };
}
function* FromAny3(schema, references, path4, value2) {
}
function* FromArgument2(schema, references, path4, value2) {
}
function* FromArray5(schema, references, path4, value2) {
  if (!IsArray(value2)) {
    return yield Create(ValueErrorType.Array, schema, path4, value2);
  }
  if (IsDefined2(schema.minItems) && !(value2.length >= schema.minItems)) {
    yield Create(ValueErrorType.ArrayMinItems, schema, path4, value2);
  }
  if (IsDefined2(schema.maxItems) && !(value2.length <= schema.maxItems)) {
    yield Create(ValueErrorType.ArrayMaxItems, schema, path4, value2);
  }
  for (let i = 0; i < value2.length; i++) {
    yield* Visit6(schema.items, references, `${path4}/${i}`, value2[i]);
  }
  if (schema.uniqueItems === true && !(function() {
    const set = /* @__PURE__ */ new Set();
    for (const element of value2) {
      const hashed = Hash(element);
      if (set.has(hashed)) {
        return false;
      } else {
        set.add(hashed);
      }
    }
    return true;
  })()) {
    yield Create(ValueErrorType.ArrayUniqueItems, schema, path4, value2);
  }
  if (!(IsDefined2(schema.contains) || IsDefined2(schema.minContains) || IsDefined2(schema.maxContains))) {
    return;
  }
  const containsSchema = IsDefined2(schema.contains) ? schema.contains : Never();
  const containsCount = value2.reduce((acc, value3, index) => Visit6(containsSchema, references, `${path4}${index}`, value3).next().done === true ? acc + 1 : acc, 0);
  if (containsCount === 0) {
    yield Create(ValueErrorType.ArrayContains, schema, path4, value2);
  }
  if (IsNumber(schema.minContains) && containsCount < schema.minContains) {
    yield Create(ValueErrorType.ArrayMinContains, schema, path4, value2);
  }
  if (IsNumber(schema.maxContains) && containsCount > schema.maxContains) {
    yield Create(ValueErrorType.ArrayMaxContains, schema, path4, value2);
  }
}
function* FromAsyncIterator3(schema, references, path4, value2) {
  if (!IsAsyncIterator(value2))
    yield Create(ValueErrorType.AsyncIterator, schema, path4, value2);
}
function* FromBigInt3(schema, references, path4, value2) {
  if (!IsBigInt(value2))
    return yield Create(ValueErrorType.BigInt, schema, path4, value2);
  if (IsDefined2(schema.exclusiveMaximum) && !(value2 < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.BigIntExclusiveMaximum, schema, path4, value2);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value2 > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.BigIntExclusiveMinimum, schema, path4, value2);
  }
  if (IsDefined2(schema.maximum) && !(value2 <= schema.maximum)) {
    yield Create(ValueErrorType.BigIntMaximum, schema, path4, value2);
  }
  if (IsDefined2(schema.minimum) && !(value2 >= schema.minimum)) {
    yield Create(ValueErrorType.BigIntMinimum, schema, path4, value2);
  }
  if (IsDefined2(schema.multipleOf) && !(value2 % schema.multipleOf === BigInt(0))) {
    yield Create(ValueErrorType.BigIntMultipleOf, schema, path4, value2);
  }
}
function* FromBoolean3(schema, references, path4, value2) {
  if (!IsBoolean(value2))
    yield Create(ValueErrorType.Boolean, schema, path4, value2);
}
function* FromConstructor3(schema, references, path4, value2) {
  yield* Visit6(schema.returns, references, path4, value2.prototype);
}
function* FromDate3(schema, references, path4, value2) {
  if (!IsDate(value2))
    return yield Create(ValueErrorType.Date, schema, path4, value2);
  if (IsDefined2(schema.exclusiveMaximumTimestamp) && !(value2.getTime() < schema.exclusiveMaximumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMaximumTimestamp, schema, path4, value2);
  }
  if (IsDefined2(schema.exclusiveMinimumTimestamp) && !(value2.getTime() > schema.exclusiveMinimumTimestamp)) {
    yield Create(ValueErrorType.DateExclusiveMinimumTimestamp, schema, path4, value2);
  }
  if (IsDefined2(schema.maximumTimestamp) && !(value2.getTime() <= schema.maximumTimestamp)) {
    yield Create(ValueErrorType.DateMaximumTimestamp, schema, path4, value2);
  }
  if (IsDefined2(schema.minimumTimestamp) && !(value2.getTime() >= schema.minimumTimestamp)) {
    yield Create(ValueErrorType.DateMinimumTimestamp, schema, path4, value2);
  }
  if (IsDefined2(schema.multipleOfTimestamp) && !(value2.getTime() % schema.multipleOfTimestamp === 0)) {
    yield Create(ValueErrorType.DateMultipleOfTimestamp, schema, path4, value2);
  }
}
function* FromFunction3(schema, references, path4, value2) {
  if (!IsFunction(value2))
    yield Create(ValueErrorType.Function, schema, path4, value2);
}
function* FromImport2(schema, references, path4, value2) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  yield* Visit6(target, [...references, ...definitions], path4, value2);
}
function* FromInteger3(schema, references, path4, value2) {
  if (!IsInteger(value2))
    return yield Create(ValueErrorType.Integer, schema, path4, value2);
  if (IsDefined2(schema.exclusiveMaximum) && !(value2 < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.IntegerExclusiveMaximum, schema, path4, value2);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value2 > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.IntegerExclusiveMinimum, schema, path4, value2);
  }
  if (IsDefined2(schema.maximum) && !(value2 <= schema.maximum)) {
    yield Create(ValueErrorType.IntegerMaximum, schema, path4, value2);
  }
  if (IsDefined2(schema.minimum) && !(value2 >= schema.minimum)) {
    yield Create(ValueErrorType.IntegerMinimum, schema, path4, value2);
  }
  if (IsDefined2(schema.multipleOf) && !(value2 % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.IntegerMultipleOf, schema, path4, value2);
  }
}
function* FromIntersect5(schema, references, path4, value2) {
  let hasError = false;
  for (const inner of schema.allOf) {
    for (const error of Visit6(inner, references, path4, value2)) {
      hasError = true;
      yield error;
    }
  }
  if (hasError) {
    return yield Create(ValueErrorType.Intersect, schema, path4, value2);
  }
  if (schema.unevaluatedProperties === false) {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value2)) {
      if (!keyCheck.test(valueKey)) {
        yield Create(ValueErrorType.IntersectUnevaluatedProperties, schema, `${path4}/${valueKey}`, value2);
      }
    }
  }
  if (typeof schema.unevaluatedProperties === "object") {
    const keyCheck = new RegExp(KeyOfPattern(schema));
    for (const valueKey of Object.getOwnPropertyNames(value2)) {
      if (!keyCheck.test(valueKey)) {
        const next = Visit6(schema.unevaluatedProperties, references, `${path4}/${valueKey}`, value2[valueKey]).next();
        if (!next.done)
          yield next.value;
      }
    }
  }
}
function* FromIterator3(schema, references, path4, value2) {
  if (!IsIterator(value2))
    yield Create(ValueErrorType.Iterator, schema, path4, value2);
}
function* FromLiteral4(schema, references, path4, value2) {
  if (!(value2 === schema.const))
    yield Create(ValueErrorType.Literal, schema, path4, value2);
}
function* FromNever3(schema, references, path4, value2) {
  yield Create(ValueErrorType.Never, schema, path4, value2);
}
function* FromNot3(schema, references, path4, value2) {
  if (Visit6(schema.not, references, path4, value2).next().done === true)
    yield Create(ValueErrorType.Not, schema, path4, value2);
}
function* FromNull3(schema, references, path4, value2) {
  if (!IsNull(value2))
    yield Create(ValueErrorType.Null, schema, path4, value2);
}
function* FromNumber3(schema, references, path4, value2) {
  if (!TypeSystemPolicy.IsNumberLike(value2))
    return yield Create(ValueErrorType.Number, schema, path4, value2);
  if (IsDefined2(schema.exclusiveMaximum) && !(value2 < schema.exclusiveMaximum)) {
    yield Create(ValueErrorType.NumberExclusiveMaximum, schema, path4, value2);
  }
  if (IsDefined2(schema.exclusiveMinimum) && !(value2 > schema.exclusiveMinimum)) {
    yield Create(ValueErrorType.NumberExclusiveMinimum, schema, path4, value2);
  }
  if (IsDefined2(schema.maximum) && !(value2 <= schema.maximum)) {
    yield Create(ValueErrorType.NumberMaximum, schema, path4, value2);
  }
  if (IsDefined2(schema.minimum) && !(value2 >= schema.minimum)) {
    yield Create(ValueErrorType.NumberMinimum, schema, path4, value2);
  }
  if (IsDefined2(schema.multipleOf) && !(value2 % schema.multipleOf === 0)) {
    yield Create(ValueErrorType.NumberMultipleOf, schema, path4, value2);
  }
}
function* FromObject3(schema, references, path4, value2) {
  if (!TypeSystemPolicy.IsObjectLike(value2))
    return yield Create(ValueErrorType.Object, schema, path4, value2);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value2).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path4, value2);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value2).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path4, value2);
  }
  const requiredKeys = Array.isArray(schema.required) ? schema.required : [];
  const knownKeys = Object.getOwnPropertyNames(schema.properties);
  const unknownKeys = Object.getOwnPropertyNames(value2);
  for (const requiredKey of requiredKeys) {
    if (unknownKeys.includes(requiredKey))
      continue;
    yield Create(ValueErrorType.ObjectRequiredProperty, schema.properties[requiredKey], `${path4}/${EscapeKey(requiredKey)}`, void 0);
  }
  if (schema.additionalProperties === false) {
    for (const valueKey of unknownKeys) {
      if (!knownKeys.includes(valueKey)) {
        yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path4}/${EscapeKey(valueKey)}`, value2[valueKey]);
      }
    }
  }
  if (typeof schema.additionalProperties === "object") {
    for (const valueKey of unknownKeys) {
      if (knownKeys.includes(valueKey))
        continue;
      yield* Visit6(schema.additionalProperties, references, `${path4}/${EscapeKey(valueKey)}`, value2[valueKey]);
    }
  }
  for (const knownKey of knownKeys) {
    const property = schema.properties[knownKey];
    if (schema.required && schema.required.includes(knownKey)) {
      yield* Visit6(property, references, `${path4}/${EscapeKey(knownKey)}`, value2[knownKey]);
      if (ExtendsUndefinedCheck(schema) && !(knownKey in value2)) {
        yield Create(ValueErrorType.ObjectRequiredProperty, property, `${path4}/${EscapeKey(knownKey)}`, void 0);
      }
    } else {
      if (TypeSystemPolicy.IsExactOptionalProperty(value2, knownKey)) {
        yield* Visit6(property, references, `${path4}/${EscapeKey(knownKey)}`, value2[knownKey]);
      }
    }
  }
}
function* FromPromise3(schema, references, path4, value2) {
  if (!IsPromise(value2))
    yield Create(ValueErrorType.Promise, schema, path4, value2);
}
function* FromRecord3(schema, references, path4, value2) {
  if (!TypeSystemPolicy.IsRecordLike(value2))
    return yield Create(ValueErrorType.Object, schema, path4, value2);
  if (IsDefined2(schema.minProperties) && !(Object.getOwnPropertyNames(value2).length >= schema.minProperties)) {
    yield Create(ValueErrorType.ObjectMinProperties, schema, path4, value2);
  }
  if (IsDefined2(schema.maxProperties) && !(Object.getOwnPropertyNames(value2).length <= schema.maxProperties)) {
    yield Create(ValueErrorType.ObjectMaxProperties, schema, path4, value2);
  }
  const [patternKey, patternSchema] = Object.entries(schema.patternProperties)[0];
  const regex = new RegExp(patternKey);
  for (const [propertyKey, propertyValue] of Object.entries(value2)) {
    if (regex.test(propertyKey))
      yield* Visit6(patternSchema, references, `${path4}/${EscapeKey(propertyKey)}`, propertyValue);
  }
  if (typeof schema.additionalProperties === "object") {
    for (const [propertyKey, propertyValue] of Object.entries(value2)) {
      if (!regex.test(propertyKey))
        yield* Visit6(schema.additionalProperties, references, `${path4}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
  if (schema.additionalProperties === false) {
    for (const [propertyKey, propertyValue] of Object.entries(value2)) {
      if (regex.test(propertyKey))
        continue;
      return yield Create(ValueErrorType.ObjectAdditionalProperties, schema, `${path4}/${EscapeKey(propertyKey)}`, propertyValue);
    }
  }
}
function* FromRef3(schema, references, path4, value2) {
  yield* Visit6(Deref(schema, references), references, path4, value2);
}
function* FromRegExp3(schema, references, path4, value2) {
  if (!IsString(value2))
    return yield Create(ValueErrorType.String, schema, path4, value2);
  if (IsDefined2(schema.minLength) && !(value2.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path4, value2);
  }
  if (IsDefined2(schema.maxLength) && !(value2.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path4, value2);
  }
  const regex = new RegExp(schema.source, schema.flags);
  if (!regex.test(value2)) {
    return yield Create(ValueErrorType.RegExp, schema, path4, value2);
  }
}
function* FromString3(schema, references, path4, value2) {
  if (!IsString(value2))
    return yield Create(ValueErrorType.String, schema, path4, value2);
  if (IsDefined2(schema.minLength) && !(value2.length >= schema.minLength)) {
    yield Create(ValueErrorType.StringMinLength, schema, path4, value2);
  }
  if (IsDefined2(schema.maxLength) && !(value2.length <= schema.maxLength)) {
    yield Create(ValueErrorType.StringMaxLength, schema, path4, value2);
  }
  if (IsString(schema.pattern)) {
    const regex = new RegExp(schema.pattern);
    if (!regex.test(value2)) {
      yield Create(ValueErrorType.StringPattern, schema, path4, value2);
    }
  }
  if (IsString(schema.format)) {
    if (!format_exports.Has(schema.format)) {
      yield Create(ValueErrorType.StringFormatUnknown, schema, path4, value2);
    } else {
      const format = format_exports.Get(schema.format);
      if (!format(value2)) {
        yield Create(ValueErrorType.StringFormat, schema, path4, value2);
      }
    }
  }
}
function* FromSymbol3(schema, references, path4, value2) {
  if (!IsSymbol(value2))
    yield Create(ValueErrorType.Symbol, schema, path4, value2);
}
function* FromTemplateLiteral4(schema, references, path4, value2) {
  if (!IsString(value2))
    return yield Create(ValueErrorType.String, schema, path4, value2);
  const regex = new RegExp(schema.pattern);
  if (!regex.test(value2)) {
    yield Create(ValueErrorType.StringPattern, schema, path4, value2);
  }
}
function* FromThis2(schema, references, path4, value2) {
  yield* Visit6(Deref(schema, references), references, path4, value2);
}
function* FromTuple5(schema, references, path4, value2) {
  if (!IsArray(value2))
    return yield Create(ValueErrorType.Tuple, schema, path4, value2);
  if (schema.items === void 0 && !(value2.length === 0)) {
    return yield Create(ValueErrorType.TupleLength, schema, path4, value2);
  }
  if (!(value2.length === schema.maxItems)) {
    return yield Create(ValueErrorType.TupleLength, schema, path4, value2);
  }
  if (!schema.items) {
    return;
  }
  for (let i = 0; i < schema.items.length; i++) {
    yield* Visit6(schema.items[i], references, `${path4}/${i}`, value2[i]);
  }
}
function* FromUndefined3(schema, references, path4, value2) {
  if (!IsUndefined(value2))
    yield Create(ValueErrorType.Undefined, schema, path4, value2);
}
function* FromUnion7(schema, references, path4, value2) {
  if (Check(schema, references, value2))
    return;
  const errors = schema.anyOf.map((variant) => new ValueErrorIterator(Visit6(variant, references, path4, value2)));
  yield Create(ValueErrorType.Union, schema, path4, value2, errors);
}
function* FromUint8Array3(schema, references, path4, value2) {
  if (!IsUint8Array(value2))
    return yield Create(ValueErrorType.Uint8Array, schema, path4, value2);
  if (IsDefined2(schema.maxByteLength) && !(value2.length <= schema.maxByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMaxByteLength, schema, path4, value2);
  }
  if (IsDefined2(schema.minByteLength) && !(value2.length >= schema.minByteLength)) {
    yield Create(ValueErrorType.Uint8ArrayMinByteLength, schema, path4, value2);
  }
}
function* FromUnknown3(schema, references, path4, value2) {
}
function* FromVoid3(schema, references, path4, value2) {
  if (!TypeSystemPolicy.IsVoidLike(value2))
    yield Create(ValueErrorType.Void, schema, path4, value2);
}
function* FromKind2(schema, references, path4, value2) {
  const check = type_exports.Get(schema[Kind]);
  if (!check(schema, value2))
    yield Create(ValueErrorType.Kind, schema, path4, value2);
}
function* Visit6(schema, references, path4, value2) {
  const references_ = IsDefined2(schema.$id) ? [...references, schema] : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return yield* FromAny3(schema_, references_, path4, value2);
    case "Argument":
      return yield* FromArgument2(schema_, references_, path4, value2);
    case "Array":
      return yield* FromArray5(schema_, references_, path4, value2);
    case "AsyncIterator":
      return yield* FromAsyncIterator3(schema_, references_, path4, value2);
    case "BigInt":
      return yield* FromBigInt3(schema_, references_, path4, value2);
    case "Boolean":
      return yield* FromBoolean3(schema_, references_, path4, value2);
    case "Constructor":
      return yield* FromConstructor3(schema_, references_, path4, value2);
    case "Date":
      return yield* FromDate3(schema_, references_, path4, value2);
    case "Function":
      return yield* FromFunction3(schema_, references_, path4, value2);
    case "Import":
      return yield* FromImport2(schema_, references_, path4, value2);
    case "Integer":
      return yield* FromInteger3(schema_, references_, path4, value2);
    case "Intersect":
      return yield* FromIntersect5(schema_, references_, path4, value2);
    case "Iterator":
      return yield* FromIterator3(schema_, references_, path4, value2);
    case "Literal":
      return yield* FromLiteral4(schema_, references_, path4, value2);
    case "Never":
      return yield* FromNever3(schema_, references_, path4, value2);
    case "Not":
      return yield* FromNot3(schema_, references_, path4, value2);
    case "Null":
      return yield* FromNull3(schema_, references_, path4, value2);
    case "Number":
      return yield* FromNumber3(schema_, references_, path4, value2);
    case "Object":
      return yield* FromObject3(schema_, references_, path4, value2);
    case "Promise":
      return yield* FromPromise3(schema_, references_, path4, value2);
    case "Record":
      return yield* FromRecord3(schema_, references_, path4, value2);
    case "Ref":
      return yield* FromRef3(schema_, references_, path4, value2);
    case "RegExp":
      return yield* FromRegExp3(schema_, references_, path4, value2);
    case "String":
      return yield* FromString3(schema_, references_, path4, value2);
    case "Symbol":
      return yield* FromSymbol3(schema_, references_, path4, value2);
    case "TemplateLiteral":
      return yield* FromTemplateLiteral4(schema_, references_, path4, value2);
    case "This":
      return yield* FromThis2(schema_, references_, path4, value2);
    case "Tuple":
      return yield* FromTuple5(schema_, references_, path4, value2);
    case "Undefined":
      return yield* FromUndefined3(schema_, references_, path4, value2);
    case "Union":
      return yield* FromUnion7(schema_, references_, path4, value2);
    case "Uint8Array":
      return yield* FromUint8Array3(schema_, references_, path4, value2);
    case "Unknown":
      return yield* FromUnknown3(schema_, references_, path4, value2);
    case "Void":
      return yield* FromVoid3(schema_, references_, path4, value2);
    default:
      if (!type_exports.Has(schema_[Kind]))
        throw new ValueErrorsUnknownTypeError(schema);
      return yield* FromKind2(schema_, references_, path4, value2);
  }
}
function Errors(...args) {
  const iterator = args.length === 3 ? Visit6(args[0], args[1], "", args[2]) : Visit6(args[0], [], "", args[1]);
  return new ValueErrorIterator(iterator);
}

// node_modules/@sinclair/typebox/build/esm/value/assert/assert.mjs
var __classPrivateFieldSet = function(receiver, state, value2, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value2) : f ? f.value = value2 : state.set(receiver, value2), value2;
};
var __classPrivateFieldGet = function(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AssertError_instances;
var _AssertError_iterator;
var _AssertError_Iterator;
var AssertError = class extends TypeBoxError {
  constructor(iterator) {
    const error = iterator.First();
    super(error === void 0 ? "Invalid Value" : error.message);
    _AssertError_instances.add(this);
    _AssertError_iterator.set(this, void 0);
    __classPrivateFieldSet(this, _AssertError_iterator, iterator, "f");
    this.error = error;
  }
  /** Returns an iterator for each error in this value. */
  Errors() {
    return new ValueErrorIterator(__classPrivateFieldGet(this, _AssertError_instances, "m", _AssertError_Iterator).call(this));
  }
};
_AssertError_iterator = /* @__PURE__ */ new WeakMap(), _AssertError_instances = /* @__PURE__ */ new WeakSet(), _AssertError_Iterator = function* _AssertError_Iterator2() {
  if (this.error)
    yield this.error;
  yield* __classPrivateFieldGet(this, _AssertError_iterator, "f");
};
function AssertValue(schema, references, value2) {
  if (Check(schema, references, value2))
    return;
  throw new AssertError(Errors(schema, references, value2));
}
function Assert(...args) {
  return args.length === 3 ? AssertValue(args[0], args[1], args[2]) : AssertValue(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/clone/clone.mjs
function FromObject4(value2) {
  const Acc = {};
  for (const key of Object.getOwnPropertyNames(value2)) {
    Acc[key] = Clone2(value2[key]);
  }
  for (const key of Object.getOwnPropertySymbols(value2)) {
    Acc[key] = Clone2(value2[key]);
  }
  return Acc;
}
function FromArray6(value2) {
  return value2.map((element) => Clone2(element));
}
function FromTypedArray(value2) {
  return value2.slice();
}
function FromMap(value2) {
  return new Map(Clone2([...value2.entries()]));
}
function FromSet(value2) {
  return new Set(Clone2([...value2.entries()]));
}
function FromDate4(value2) {
  return new Date(value2.toISOString());
}
function FromValue(value2) {
  return value2;
}
function Clone2(value2) {
  if (IsArray(value2))
    return FromArray6(value2);
  if (IsDate(value2))
    return FromDate4(value2);
  if (IsTypedArray(value2))
    return FromTypedArray(value2);
  if (IsMap(value2))
    return FromMap(value2);
  if (IsSet(value2))
    return FromSet(value2);
  if (IsObject(value2))
    return FromObject4(value2);
  if (IsValueType(value2))
    return FromValue(value2);
  throw new Error("ValueClone: Unable to clone value");
}

// node_modules/@sinclair/typebox/build/esm/value/create/create.mjs
var ValueCreateError = class extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
};
function FromDefault(value2) {
  return IsFunction(value2) ? value2() : Clone2(value2);
}
function FromAny4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromArgument3(schema, references) {
  return {};
}
function FromArray7(schema, references) {
  if (schema.uniqueItems === true && !HasPropertyKey(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the uniqueItems constraint requires a default value");
  } else if ("contains" in schema && !HasPropertyKey(schema, "default")) {
    throw new ValueCreateError(schema, "Array with the contains constraint requires a default value");
  } else if ("default" in schema) {
    return FromDefault(schema.default);
  } else if (schema.minItems !== void 0) {
    return Array.from({ length: schema.minItems }).map((item) => {
      return Visit7(schema.items, references);
    });
  } else {
    return [];
  }
}
function FromAsyncIterator4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return (async function* () {
    })();
  }
}
function FromBigInt4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return BigInt(0);
  }
}
function FromBoolean4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return false;
  }
}
function FromConstructor4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value2 = Visit7(schema.returns, references);
    if (typeof value2 === "object" && !Array.isArray(value2)) {
      return class {
        constructor() {
          for (const [key, val] of Object.entries(value2)) {
            const self = this;
            self[key] = val;
          }
        }
      };
    } else {
      return class {
      };
    }
  }
}
function FromDate5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimumTimestamp !== void 0) {
    return new Date(schema.minimumTimestamp);
  } else {
    return /* @__PURE__ */ new Date();
  }
}
function FromFunction4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return () => Visit7(schema.returns, references);
  }
}
function FromImport3(schema, references) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit7(target, [...references, ...definitions]);
}
function FromInteger4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== void 0) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromIntersect6(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const value2 = schema.allOf.reduce((acc, schema2) => {
      const next = Visit7(schema2, references);
      return typeof next === "object" ? { ...acc, ...next } : next;
    }, {});
    if (!Check(schema, references, value2))
      throw new ValueCreateError(schema, "Intersect produced invalid value. Consider using a default value.");
    return value2;
  }
}
function FromIterator4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return (function* () {
    })();
  }
}
function FromLiteral5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return schema.const;
  }
}
function FromNever4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Never types cannot be created. Consider using a default value.");
  }
}
function FromNot4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "Not types must have a default value");
  }
}
function FromNull4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return null;
  }
}
function FromNumber4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minimum !== void 0) {
    return schema.minimum;
  } else {
    return 0;
  }
}
function FromObject5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    const required = new Set(schema.required);
    const Acc = {};
    for (const [key, subschema] of Object.entries(schema.properties)) {
      if (!required.has(key))
        continue;
      Acc[key] = Visit7(subschema, references);
    }
    return Acc;
  }
}
function FromPromise4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Promise.resolve(Visit7(schema.item, references));
  }
}
function FromRecord4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromRef4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromRegExp4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new ValueCreateError(schema, "RegExp types cannot be created. Consider using a default value.");
  }
}
function FromString4(schema, references) {
  if (schema.pattern !== void 0) {
    if (!HasPropertyKey(schema, "default")) {
      throw new ValueCreateError(schema, "String types with patterns must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else if (schema.format !== void 0) {
    if (!HasPropertyKey(schema, "default")) {
      throw new ValueCreateError(schema, "String types with formats must specify a default value");
    } else {
      return FromDefault(schema.default);
    }
  } else {
    if (HasPropertyKey(schema, "default")) {
      return FromDefault(schema.default);
    } else if (schema.minLength !== void 0) {
      return Array.from({ length: schema.minLength }).map(() => " ").join("");
    } else {
      return "";
    }
  }
}
function FromSymbol4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if ("value" in schema) {
    return Symbol.for(schema.value);
  } else {
    return Symbol();
  }
}
function FromTemplateLiteral5(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (!IsTemplateLiteralFinite(schema))
    throw new ValueCreateError(schema, "Can only create template literals that produce a finite variants. Consider using a default value.");
  const generated = TemplateLiteralGenerate(schema);
  return generated[0];
}
function FromThis3(schema, references) {
  if (recursiveDepth++ > recursiveMaxDepth)
    throw new ValueCreateError(schema, "Cannot create recursive type as it appears possibly infinite. Consider using a default.");
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return Visit7(Deref(schema, references), references);
  }
}
function FromTuple6(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  }
  if (schema.items === void 0) {
    return [];
  } else {
    return Array.from({ length: schema.minItems }).map((_, index) => Visit7(schema.items[index], references));
  }
}
function FromUndefined4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return void 0;
  }
}
function FromUnion8(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.anyOf.length === 0) {
    throw new Error("ValueCreate.Union: Cannot create Union with zero variants");
  } else {
    return Visit7(schema.anyOf[0], references);
  }
}
function FromUint8Array4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else if (schema.minByteLength !== void 0) {
    return new Uint8Array(schema.minByteLength);
  } else {
    return new Uint8Array(0);
  }
}
function FromUnknown4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return {};
  }
}
function FromVoid4(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    return void 0;
  }
}
function FromKind3(schema, references) {
  if (HasPropertyKey(schema, "default")) {
    return FromDefault(schema.default);
  } else {
    throw new Error("User defined types must specify a default value");
  }
}
function Visit7(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Any":
      return FromAny4(schema_, references_);
    case "Argument":
      return FromArgument3(schema_, references_);
    case "Array":
      return FromArray7(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator4(schema_, references_);
    case "BigInt":
      return FromBigInt4(schema_, references_);
    case "Boolean":
      return FromBoolean4(schema_, references_);
    case "Constructor":
      return FromConstructor4(schema_, references_);
    case "Date":
      return FromDate5(schema_, references_);
    case "Function":
      return FromFunction4(schema_, references_);
    case "Import":
      return FromImport3(schema_, references_);
    case "Integer":
      return FromInteger4(schema_, references_);
    case "Intersect":
      return FromIntersect6(schema_, references_);
    case "Iterator":
      return FromIterator4(schema_, references_);
    case "Literal":
      return FromLiteral5(schema_, references_);
    case "Never":
      return FromNever4(schema_, references_);
    case "Not":
      return FromNot4(schema_, references_);
    case "Null":
      return FromNull4(schema_, references_);
    case "Number":
      return FromNumber4(schema_, references_);
    case "Object":
      return FromObject5(schema_, references_);
    case "Promise":
      return FromPromise4(schema_, references_);
    case "Record":
      return FromRecord4(schema_, references_);
    case "Ref":
      return FromRef4(schema_, references_);
    case "RegExp":
      return FromRegExp4(schema_, references_);
    case "String":
      return FromString4(schema_, references_);
    case "Symbol":
      return FromSymbol4(schema_, references_);
    case "TemplateLiteral":
      return FromTemplateLiteral5(schema_, references_);
    case "This":
      return FromThis3(schema_, references_);
    case "Tuple":
      return FromTuple6(schema_, references_);
    case "Undefined":
      return FromUndefined4(schema_, references_);
    case "Union":
      return FromUnion8(schema_, references_);
    case "Uint8Array":
      return FromUint8Array4(schema_, references_);
    case "Unknown":
      return FromUnknown4(schema_, references_);
    case "Void":
      return FromVoid4(schema_, references_);
    default:
      if (!type_exports.Has(schema_[Kind]))
        throw new ValueCreateError(schema_, "Unknown type");
      return FromKind3(schema_, references_);
  }
}
var recursiveMaxDepth = 512;
var recursiveDepth = 0;
function Create2(...args) {
  recursiveDepth = 0;
  return args.length === 2 ? Visit7(args[0], args[1]) : Visit7(args[0], []);
}

// node_modules/@sinclair/typebox/build/esm/value/cast/cast.mjs
var ValueCastError = class extends TypeBoxError {
  constructor(schema, message) {
    super(message);
    this.schema = schema;
  }
};
function ScoreUnion(schema, references, value2) {
  if (schema[Kind] === "Object" && typeof value2 === "object" && !IsNull(value2)) {
    const object = schema;
    const keys = Object.getOwnPropertyNames(value2);
    const entries = Object.entries(object.properties);
    return entries.reduce((acc, [key, schema2]) => {
      const literal = schema2[Kind] === "Literal" && schema2.const === value2[key] ? 100 : 0;
      const checks = Check(schema2, references, value2[key]) ? 10 : 0;
      const exists = keys.includes(key) ? 1 : 0;
      return acc + (literal + checks + exists);
    }, 0);
  } else if (schema[Kind] === "Union") {
    const schemas = schema.anyOf.map((schema2) => Deref(schema2, references));
    const scores = schemas.map((schema2) => ScoreUnion(schema2, references, value2));
    return Math.max(...scores);
  } else {
    return Check(schema, references, value2) ? 1 : 0;
  }
}
function SelectUnion(union, references, value2) {
  const schemas = union.anyOf.map((schema) => Deref(schema, references));
  let [select, best] = [schemas[0], 0];
  for (const schema of schemas) {
    const score = ScoreUnion(schema, references, value2);
    if (score > best) {
      select = schema;
      best = score;
    }
  }
  return select;
}
function CastUnion(union, references, value2) {
  if ("default" in union) {
    return typeof value2 === "function" ? union.default : Clone2(union.default);
  } else {
    const schema = SelectUnion(union, references, value2);
    return Cast(schema, references, value2);
  }
}
function DefaultClone(schema, references, value2) {
  return Check(schema, references, value2) ? Clone2(value2) : Create2(schema, references);
}
function Default(schema, references, value2) {
  return Check(schema, references, value2) ? value2 : Create2(schema, references);
}
function FromArray8(schema, references, value2) {
  if (Check(schema, references, value2))
    return Clone2(value2);
  const created = IsArray(value2) ? Clone2(value2) : Create2(schema, references);
  const minimum = IsNumber(schema.minItems) && created.length < schema.minItems ? [...created, ...Array.from({ length: schema.minItems - created.length }, () => null)] : created;
  const maximum = IsNumber(schema.maxItems) && minimum.length > schema.maxItems ? minimum.slice(0, schema.maxItems) : minimum;
  const casted = maximum.map((value3) => Visit8(schema.items, references, value3));
  if (schema.uniqueItems !== true)
    return casted;
  const unique = [...new Set(casted)];
  if (!Check(schema, references, unique))
    throw new ValueCastError(schema, "Array cast produced invalid data due to uniqueItems constraint");
  return unique;
}
function FromConstructor5(schema, references, value2) {
  if (Check(schema, references, value2))
    return Create2(schema, references);
  const required = new Set(schema.returns.required || []);
  const result = function() {
  };
  for (const [key, property] of Object.entries(schema.returns.properties)) {
    if (!required.has(key) && value2.prototype[key] === void 0)
      continue;
    result.prototype[key] = Visit8(property, references, value2.prototype[key]);
  }
  return result;
}
function FromImport4(schema, references, value2) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit8(target, [...references, ...definitions], value2);
}
function IntersectAssign(correct, value2) {
  if (IsObject(correct) && !IsObject(value2) || !IsObject(correct) && IsObject(value2))
    return correct;
  if (!IsObject(correct) || !IsObject(value2))
    return value2;
  return globalThis.Object.getOwnPropertyNames(correct).reduce((result, key) => {
    const property = key in value2 ? IntersectAssign(correct[key], value2[key]) : correct[key];
    return { ...result, [key]: property };
  }, {});
}
function FromIntersect7(schema, references, value2) {
  if (Check(schema, references, value2))
    return value2;
  const correct = Create2(schema, references);
  const assigned = IntersectAssign(correct, value2);
  return Check(schema, references, assigned) ? assigned : correct;
}
function FromNever5(schema, references, value2) {
  throw new ValueCastError(schema, "Never types cannot be cast");
}
function FromObject6(schema, references, value2) {
  if (Check(schema, references, value2))
    return value2;
  if (value2 === null || typeof value2 !== "object")
    return Create2(schema, references);
  const required = new Set(schema.required || []);
  const result = {};
  for (const [key, property] of Object.entries(schema.properties)) {
    if (!required.has(key) && value2[key] === void 0)
      continue;
    result[key] = Visit8(property, references, value2[key]);
  }
  if (typeof schema.additionalProperties === "object") {
    const propertyNames = Object.getOwnPropertyNames(schema.properties);
    for (const propertyName of Object.getOwnPropertyNames(value2)) {
      if (propertyNames.includes(propertyName))
        continue;
      result[propertyName] = Visit8(schema.additionalProperties, references, value2[propertyName]);
    }
  }
  return result;
}
function FromRecord5(schema, references, value2) {
  if (Check(schema, references, value2))
    return Clone2(value2);
  if (value2 === null || typeof value2 !== "object" || Array.isArray(value2) || value2 instanceof Date)
    return Create2(schema, references);
  const subschemaPropertyName = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const subschema = schema.patternProperties[subschemaPropertyName];
  const result = {};
  for (const [propKey, propValue] of Object.entries(value2)) {
    result[propKey] = Visit8(subschema, references, propValue);
  }
  return result;
}
function FromRef5(schema, references, value2) {
  return Visit8(Deref(schema, references), references, value2);
}
function FromThis4(schema, references, value2) {
  return Visit8(Deref(schema, references), references, value2);
}
function FromTuple7(schema, references, value2) {
  if (Check(schema, references, value2))
    return Clone2(value2);
  if (!IsArray(value2))
    return Create2(schema, references);
  if (schema.items === void 0)
    return [];
  return schema.items.map((schema2, index) => Visit8(schema2, references, value2[index]));
}
function FromUnion9(schema, references, value2) {
  return Check(schema, references, value2) ? Clone2(value2) : CastUnion(schema, references, value2);
}
function Visit8(schema, references, value2) {
  const references_ = IsString(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema[Kind]) {
    // --------------------------------------------------------------
    // Structural
    // --------------------------------------------------------------
    case "Array":
      return FromArray8(schema_, references_, value2);
    case "Constructor":
      return FromConstructor5(schema_, references_, value2);
    case "Import":
      return FromImport4(schema_, references_, value2);
    case "Intersect":
      return FromIntersect7(schema_, references_, value2);
    case "Never":
      return FromNever5(schema_, references_, value2);
    case "Object":
      return FromObject6(schema_, references_, value2);
    case "Record":
      return FromRecord5(schema_, references_, value2);
    case "Ref":
      return FromRef5(schema_, references_, value2);
    case "This":
      return FromThis4(schema_, references_, value2);
    case "Tuple":
      return FromTuple7(schema_, references_, value2);
    case "Union":
      return FromUnion9(schema_, references_, value2);
    // --------------------------------------------------------------
    // DefaultClone
    // --------------------------------------------------------------
    case "Date":
    case "Symbol":
    case "Uint8Array":
      return DefaultClone(schema, references, value2);
    // --------------------------------------------------------------
    // Default
    // --------------------------------------------------------------
    default:
      return Default(schema_, references_, value2);
  }
}
function Cast(...args) {
  return args.length === 3 ? Visit8(args[0], args[1], args[2]) : Visit8(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/clean/clean.mjs
function IsCheckable(schema) {
  return IsKind(schema) && schema[Kind] !== "Unsafe";
}
function FromArray9(schema, references, value2) {
  if (!IsArray(value2))
    return value2;
  return value2.map((value3) => Visit9(schema.items, references, value3));
}
function FromImport5(schema, references, value2) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit9(target, [...references, ...definitions], value2);
}
function FromIntersect8(schema, references, value2) {
  const unevaluatedProperties = schema.unevaluatedProperties;
  const intersections = schema.allOf.map((schema2) => Visit9(schema2, references, Clone2(value2)));
  const composite = intersections.reduce((acc, value3) => IsObject(value3) ? { ...acc, ...value3 } : value3, {});
  if (!IsObject(value2) || !IsObject(composite) || !IsKind(unevaluatedProperties))
    return composite;
  const knownkeys = KeyOfPropertyKeys(schema);
  for (const key of Object.getOwnPropertyNames(value2)) {
    if (knownkeys.includes(key))
      continue;
    if (Check(unevaluatedProperties, references, value2[key])) {
      composite[key] = Visit9(unevaluatedProperties, references, value2[key]);
    }
  }
  return composite;
}
function FromObject7(schema, references, value2) {
  if (!IsObject(value2) || IsArray(value2))
    return value2;
  const additionalProperties = schema.additionalProperties;
  for (const key of Object.getOwnPropertyNames(value2)) {
    if (HasPropertyKey(schema.properties, key)) {
      value2[key] = Visit9(schema.properties[key], references, value2[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value2[key])) {
      value2[key] = Visit9(additionalProperties, references, value2[key]);
      continue;
    }
    delete value2[key];
  }
  return value2;
}
function FromRecord6(schema, references, value2) {
  if (!IsObject(value2))
    return value2;
  const additionalProperties = schema.additionalProperties;
  const propertyKeys = Object.getOwnPropertyNames(value2);
  const [propertyKey, propertySchema] = Object.entries(schema.patternProperties)[0];
  const propertyKeyTest = new RegExp(propertyKey);
  for (const key of propertyKeys) {
    if (propertyKeyTest.test(key)) {
      value2[key] = Visit9(propertySchema, references, value2[key]);
      continue;
    }
    if (IsKind(additionalProperties) && Check(additionalProperties, references, value2[key])) {
      value2[key] = Visit9(additionalProperties, references, value2[key]);
      continue;
    }
    delete value2[key];
  }
  return value2;
}
function FromRef6(schema, references, value2) {
  return Visit9(Deref(schema, references), references, value2);
}
function FromThis5(schema, references, value2) {
  return Visit9(Deref(schema, references), references, value2);
}
function FromTuple8(schema, references, value2) {
  if (!IsArray(value2))
    return value2;
  if (IsUndefined(schema.items))
    return [];
  const length = Math.min(value2.length, schema.items.length);
  for (let i = 0; i < length; i++) {
    value2[i] = Visit9(schema.items[i], references, value2[i]);
  }
  return value2.length > length ? value2.slice(0, length) : value2;
}
function FromUnion10(schema, references, value2) {
  for (const inner of schema.anyOf) {
    if (IsCheckable(inner) && Check(inner, references, value2)) {
      return Visit9(inner, references, value2);
    }
  }
  return value2;
}
function Visit9(schema, references, value2) {
  const references_ = IsString(schema.$id) ? Pushref(schema, references) : references;
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray9(schema_, references_, value2);
    case "Import":
      return FromImport5(schema_, references_, value2);
    case "Intersect":
      return FromIntersect8(schema_, references_, value2);
    case "Object":
      return FromObject7(schema_, references_, value2);
    case "Record":
      return FromRecord6(schema_, references_, value2);
    case "Ref":
      return FromRef6(schema_, references_, value2);
    case "This":
      return FromThis5(schema_, references_, value2);
    case "Tuple":
      return FromTuple8(schema_, references_, value2);
    case "Union":
      return FromUnion10(schema_, references_, value2);
    default:
      return value2;
  }
}
function Clean(...args) {
  return args.length === 3 ? Visit9(args[0], args[1], args[2]) : Visit9(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/convert/convert.mjs
function IsStringNumeric(value2) {
  return IsString(value2) && !isNaN(value2) && !isNaN(parseFloat(value2));
}
function IsValueToString(value2) {
  return IsBigInt(value2) || IsBoolean(value2) || IsNumber(value2);
}
function IsValueTrue(value2) {
  return value2 === true || IsNumber(value2) && value2 === 1 || IsBigInt(value2) && value2 === BigInt("1") || IsString(value2) && (value2.toLowerCase() === "true" || value2 === "1");
}
function IsValueFalse(value2) {
  return value2 === false || IsNumber(value2) && (value2 === 0 || Object.is(value2, -0)) || IsBigInt(value2) && value2 === BigInt("0") || IsString(value2) && (value2.toLowerCase() === "false" || value2 === "0" || value2 === "-0");
}
function IsTimeStringWithTimeZone(value2) {
  return IsString(value2) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value2);
}
function IsTimeStringWithoutTimeZone(value2) {
  return IsString(value2) && /^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value2);
}
function IsDateTimeStringWithTimeZone(value2) {
  return IsString(value2) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i.test(value2);
}
function IsDateTimeStringWithoutTimeZone(value2) {
  return IsString(value2) && /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)?$/i.test(value2);
}
function IsDateString(value2) {
  return IsString(value2) && /^\d\d\d\d-[0-1]\d-[0-3]\d$/i.test(value2);
}
function TryConvertLiteralString(value2, target) {
  const conversion = TryConvertString(value2);
  return conversion === target ? conversion : value2;
}
function TryConvertLiteralNumber(value2, target) {
  const conversion = TryConvertNumber(value2);
  return conversion === target ? conversion : value2;
}
function TryConvertLiteralBoolean(value2, target) {
  const conversion = TryConvertBoolean(value2);
  return conversion === target ? conversion : value2;
}
function TryConvertLiteral(schema, value2) {
  return IsString(schema.const) ? TryConvertLiteralString(value2, schema.const) : IsNumber(schema.const) ? TryConvertLiteralNumber(value2, schema.const) : IsBoolean(schema.const) ? TryConvertLiteralBoolean(value2, schema.const) : value2;
}
function TryConvertBoolean(value2) {
  return IsValueTrue(value2) ? true : IsValueFalse(value2) ? false : value2;
}
function TryConvertBigInt(value2) {
  const truncateInteger = (value3) => value3.split(".")[0];
  return IsStringNumeric(value2) ? BigInt(truncateInteger(value2)) : IsNumber(value2) ? BigInt(Math.trunc(value2)) : IsValueFalse(value2) ? BigInt(0) : IsValueTrue(value2) ? BigInt(1) : value2;
}
function TryConvertString(value2) {
  return IsSymbol(value2) && value2.description !== void 0 ? value2.description.toString() : IsValueToString(value2) ? value2.toString() : value2;
}
function TryConvertNumber(value2) {
  return IsStringNumeric(value2) ? parseFloat(value2) : IsValueTrue(value2) ? 1 : IsValueFalse(value2) ? 0 : value2;
}
function TryConvertInteger(value2) {
  return IsStringNumeric(value2) ? parseInt(value2) : IsNumber(value2) ? Math.trunc(value2) : IsValueTrue(value2) ? 1 : IsValueFalse(value2) ? 0 : value2;
}
function TryConvertNull(value2) {
  return IsString(value2) && value2.toLowerCase() === "null" ? null : value2;
}
function TryConvertUndefined(value2) {
  return IsString(value2) && value2 === "undefined" ? void 0 : value2;
}
function TryConvertDate(value2) {
  return IsDate(value2) ? value2 : IsNumber(value2) ? new Date(value2) : IsValueTrue(value2) ? /* @__PURE__ */ new Date(1) : IsValueFalse(value2) ? /* @__PURE__ */ new Date(0) : IsStringNumeric(value2) ? new Date(parseInt(value2)) : IsTimeStringWithoutTimeZone(value2) ? /* @__PURE__ */ new Date(`1970-01-01T${value2}.000Z`) : IsTimeStringWithTimeZone(value2) ? /* @__PURE__ */ new Date(`1970-01-01T${value2}`) : IsDateTimeStringWithoutTimeZone(value2) ? /* @__PURE__ */ new Date(`${value2}.000Z`) : IsDateTimeStringWithTimeZone(value2) ? new Date(value2) : IsDateString(value2) ? /* @__PURE__ */ new Date(`${value2}T00:00:00.000Z`) : value2;
}
function Default2(value2) {
  return value2;
}
function FromArray10(schema, references, value2) {
  const elements = IsArray(value2) ? value2 : [value2];
  return elements.map((element) => Visit10(schema.items, references, element));
}
function FromBigInt5(schema, references, value2) {
  return TryConvertBigInt(value2);
}
function FromBoolean5(schema, references, value2) {
  return TryConvertBoolean(value2);
}
function FromDate6(schema, references, value2) {
  return TryConvertDate(value2);
}
function FromImport6(schema, references, value2) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit10(target, [...references, ...definitions], value2);
}
function FromInteger5(schema, references, value2) {
  return TryConvertInteger(value2);
}
function FromIntersect9(schema, references, value2) {
  return schema.allOf.reduce((value3, schema2) => Visit10(schema2, references, value3), value2);
}
function FromLiteral6(schema, references, value2) {
  return TryConvertLiteral(schema, value2);
}
function FromNull5(schema, references, value2) {
  return TryConvertNull(value2);
}
function FromNumber5(schema, references, value2) {
  return TryConvertNumber(value2);
}
function FromObject8(schema, references, value2) {
  if (!IsObject(value2) || IsArray(value2))
    return value2;
  for (const propertyKey of Object.getOwnPropertyNames(schema.properties)) {
    if (!HasPropertyKey(value2, propertyKey))
      continue;
    value2[propertyKey] = Visit10(schema.properties[propertyKey], references, value2[propertyKey]);
  }
  return value2;
}
function FromRecord7(schema, references, value2) {
  const isConvertable = IsObject(value2) && !IsArray(value2);
  if (!isConvertable)
    return value2;
  const propertyKey = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[propertyKey];
  for (const [propKey, propValue] of Object.entries(value2)) {
    value2[propKey] = Visit10(property, references, propValue);
  }
  return value2;
}
function FromRef7(schema, references, value2) {
  return Visit10(Deref(schema, references), references, value2);
}
function FromString5(schema, references, value2) {
  return TryConvertString(value2);
}
function FromSymbol5(schema, references, value2) {
  return IsString(value2) || IsNumber(value2) ? Symbol(value2) : value2;
}
function FromThis6(schema, references, value2) {
  return Visit10(Deref(schema, references), references, value2);
}
function FromTuple9(schema, references, value2) {
  const isConvertable = IsArray(value2) && !IsUndefined(schema.items);
  if (!isConvertable)
    return value2;
  return value2.map((value3, index) => {
    return index < schema.items.length ? Visit10(schema.items[index], references, value3) : value3;
  });
}
function FromUndefined5(schema, references, value2) {
  return TryConvertUndefined(value2);
}
function FromUnion11(schema, references, value2) {
  for (const subschema of schema.anyOf) {
    if (Check(subschema, references, value2)) {
      return value2;
    }
  }
  for (const subschema of schema.anyOf) {
    const converted = Visit10(subschema, references, Clone2(value2));
    if (!Check(subschema, references, converted))
      continue;
    return converted;
  }
  return value2;
}
function Visit10(schema, references, value2) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray10(schema_, references_, value2);
    case "BigInt":
      return FromBigInt5(schema_, references_, value2);
    case "Boolean":
      return FromBoolean5(schema_, references_, value2);
    case "Date":
      return FromDate6(schema_, references_, value2);
    case "Import":
      return FromImport6(schema_, references_, value2);
    case "Integer":
      return FromInteger5(schema_, references_, value2);
    case "Intersect":
      return FromIntersect9(schema_, references_, value2);
    case "Literal":
      return FromLiteral6(schema_, references_, value2);
    case "Null":
      return FromNull5(schema_, references_, value2);
    case "Number":
      return FromNumber5(schema_, references_, value2);
    case "Object":
      return FromObject8(schema_, references_, value2);
    case "Record":
      return FromRecord7(schema_, references_, value2);
    case "Ref":
      return FromRef7(schema_, references_, value2);
    case "String":
      return FromString5(schema_, references_, value2);
    case "Symbol":
      return FromSymbol5(schema_, references_, value2);
    case "This":
      return FromThis6(schema_, references_, value2);
    case "Tuple":
      return FromTuple9(schema_, references_, value2);
    case "Undefined":
      return FromUndefined5(schema_, references_, value2);
    case "Union":
      return FromUnion11(schema_, references_, value2);
    default:
      return Default2(value2);
  }
}
function Convert(...args) {
  return args.length === 3 ? Visit10(args[0], args[1], args[2]) : Visit10(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/decode.mjs
var TransformDecodeCheckError = class extends TypeBoxError {
  constructor(schema, value2, error) {
    super(`Unable to decode value as it does not match the expected schema`);
    this.schema = schema;
    this.value = value2;
    this.error = error;
  }
};
var TransformDecodeError = class extends TypeBoxError {
  constructor(schema, path4, value2, error) {
    super(error instanceof Error ? error.message : "Unknown error");
    this.schema = schema;
    this.path = path4;
    this.value = value2;
    this.error = error;
  }
};
function Default3(schema, path4, value2) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Decode(value2) : value2;
  } catch (error) {
    throw new TransformDecodeError(schema, path4, value2, error);
  }
}
function FromArray11(schema, references, path4, value2) {
  return IsArray(value2) ? Default3(schema, path4, value2.map((value3, index) => Visit11(schema.items, references, `${path4}/${index}`, value3))) : Default3(schema, path4, value2);
}
function FromIntersect10(schema, references, path4, value2) {
  if (!IsObject(value2) || IsValueType(value2))
    return Default3(schema, path4, value2);
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...value2 };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit11(knownSchema, references, `${path4}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return Default3(schema, path4, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(unevaluatedProperties, `${path4}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path4, unknownProperties);
}
function FromImport7(schema, references, path4, value2) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result = Visit11(target, [...references, ...additional], path4, value2);
  return Default3(schema, path4, result);
}
function FromNot5(schema, references, path4, value2) {
  return Default3(schema, path4, Visit11(schema.not, references, path4, value2));
}
function FromObject9(schema, references, path4, value2) {
  if (!IsObject(value2))
    return Default3(schema, path4, value2);
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...value2 };
  for (const key of knownKeys) {
    if (!HasPropertyKey(knownProperties, key))
      continue;
    if (IsUndefined(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit11(schema.properties[key], references, `${path4}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path4, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path4}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path4, unknownProperties);
}
function FromRecord8(schema, references, path4, value2) {
  if (!IsObject(value2))
    return Default3(schema, path4, value2);
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...value2 };
  for (const key of Object.getOwnPropertyNames(value2))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit11(schema.patternProperties[pattern], references, `${path4}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return Default3(schema, path4, knownProperties);
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const unknownProperties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      unknownProperties[key] = Default3(additionalProperties, `${path4}/${key}`, unknownProperties[key]);
    }
  return Default3(schema, path4, unknownProperties);
}
function FromRef8(schema, references, path4, value2) {
  const target = Deref(schema, references);
  return Default3(schema, path4, Visit11(target, references, path4, value2));
}
function FromThis7(schema, references, path4, value2) {
  const target = Deref(schema, references);
  return Default3(schema, path4, Visit11(target, references, path4, value2));
}
function FromTuple10(schema, references, path4, value2) {
  return IsArray(value2) && IsArray(schema.items) ? Default3(schema, path4, schema.items.map((schema2, index) => Visit11(schema2, references, `${path4}/${index}`, value2[index]))) : Default3(schema, path4, value2);
}
function FromUnion12(schema, references, path4, value2) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value2))
      continue;
    const decoded = Visit11(subschema, references, path4, value2);
    return Default3(schema, path4, decoded);
  }
  return Default3(schema, path4, value2);
}
function Visit11(schema, references, path4, value2) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray11(schema_, references_, path4, value2);
    case "Import":
      return FromImport7(schema_, references_, path4, value2);
    case "Intersect":
      return FromIntersect10(schema_, references_, path4, value2);
    case "Not":
      return FromNot5(schema_, references_, path4, value2);
    case "Object":
      return FromObject9(schema_, references_, path4, value2);
    case "Record":
      return FromRecord8(schema_, references_, path4, value2);
    case "Ref":
      return FromRef8(schema_, references_, path4, value2);
    case "Symbol":
      return Default3(schema_, path4, value2);
    case "This":
      return FromThis7(schema_, references_, path4, value2);
    case "Tuple":
      return FromTuple10(schema_, references_, path4, value2);
    case "Union":
      return FromUnion12(schema_, references_, path4, value2);
    default:
      return Default3(schema_, path4, value2);
  }
}
function TransformDecode(schema, references, value2) {
  return Visit11(schema, references, "", value2);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/encode.mjs
var TransformEncodeCheckError = class extends TypeBoxError {
  constructor(schema, value2, error) {
    super(`The encoded value does not match the expected schema`);
    this.schema = schema;
    this.value = value2;
    this.error = error;
  }
};
var TransformEncodeError = class extends TypeBoxError {
  constructor(schema, path4, value2, error) {
    super(`${error instanceof Error ? error.message : "Unknown error"}`);
    this.schema = schema;
    this.path = path4;
    this.value = value2;
    this.error = error;
  }
};
function Default4(schema, path4, value2) {
  try {
    return IsTransform(schema) ? schema[TransformKind].Encode(value2) : value2;
  } catch (error) {
    throw new TransformEncodeError(schema, path4, value2, error);
  }
}
function FromArray12(schema, references, path4, value2) {
  const defaulted = Default4(schema, path4, value2);
  return IsArray(defaulted) ? defaulted.map((value3, index) => Visit12(schema.items, references, `${path4}/${index}`, value3)) : defaulted;
}
function FromImport8(schema, references, path4, value2) {
  const additional = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  const result = Default4(schema, path4, value2);
  return Visit12(target, [...references, ...additional], path4, result);
}
function FromIntersect11(schema, references, path4, value2) {
  const defaulted = Default4(schema, path4, value2);
  if (!IsObject(value2) || IsValueType(value2))
    return defaulted;
  const knownEntries = KeyOfPropertyEntries(schema);
  const knownKeys = knownEntries.map((entry) => entry[0]);
  const knownProperties = { ...defaulted };
  for (const [knownKey, knownSchema] of knownEntries)
    if (knownKey in knownProperties) {
      knownProperties[knownKey] = Visit12(knownSchema, references, `${path4}/${knownKey}`, knownProperties[knownKey]);
    }
  if (!IsTransform(schema.unevaluatedProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const unevaluatedProperties = schema.unevaluatedProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(unevaluatedProperties, `${path4}/${key}`, properties[key]);
    }
  return properties;
}
function FromNot6(schema, references, path4, value2) {
  return Default4(schema.not, path4, Default4(schema, path4, value2));
}
function FromObject10(schema, references, path4, value2) {
  const defaulted = Default4(schema, path4, value2);
  if (!IsObject(defaulted))
    return defaulted;
  const knownKeys = KeyOfPropertyKeys(schema);
  const knownProperties = { ...defaulted };
  for (const key of knownKeys) {
    if (!HasPropertyKey(knownProperties, key))
      continue;
    if (IsUndefined(knownProperties[key]) && (!IsUndefined3(schema.properties[key]) || TypeSystemPolicy.IsExactOptionalProperty(knownProperties, key)))
      continue;
    knownProperties[key] = Visit12(schema.properties[key], references, `${path4}/${key}`, knownProperties[key]);
  }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.includes(key)) {
      properties[key] = Default4(additionalProperties, `${path4}/${key}`, properties[key]);
    }
  return properties;
}
function FromRecord9(schema, references, path4, value2) {
  const defaulted = Default4(schema, path4, value2);
  if (!IsObject(value2))
    return defaulted;
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const knownKeys = new RegExp(pattern);
  const knownProperties = { ...defaulted };
  for (const key of Object.getOwnPropertyNames(value2))
    if (knownKeys.test(key)) {
      knownProperties[key] = Visit12(schema.patternProperties[pattern], references, `${path4}/${key}`, knownProperties[key]);
    }
  if (!IsSchema(schema.additionalProperties)) {
    return knownProperties;
  }
  const unknownKeys = Object.getOwnPropertyNames(knownProperties);
  const additionalProperties = schema.additionalProperties;
  const properties = { ...knownProperties };
  for (const key of unknownKeys)
    if (!knownKeys.test(key)) {
      properties[key] = Default4(additionalProperties, `${path4}/${key}`, properties[key]);
    }
  return properties;
}
function FromRef9(schema, references, path4, value2) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path4, value2);
  return Default4(schema, path4, resolved);
}
function FromThis8(schema, references, path4, value2) {
  const target = Deref(schema, references);
  const resolved = Visit12(target, references, path4, value2);
  return Default4(schema, path4, resolved);
}
function FromTuple11(schema, references, path4, value2) {
  const value1 = Default4(schema, path4, value2);
  return IsArray(schema.items) ? schema.items.map((schema2, index) => Visit12(schema2, references, `${path4}/${index}`, value1[index])) : [];
}
function FromUnion13(schema, references, path4, value2) {
  for (const subschema of schema.anyOf) {
    if (!Check(subschema, references, value2))
      continue;
    const value1 = Visit12(subschema, references, path4, value2);
    return Default4(schema, path4, value1);
  }
  for (const subschema of schema.anyOf) {
    const value1 = Visit12(subschema, references, path4, value2);
    if (!Check(schema, references, value1))
      continue;
    return Default4(schema, path4, value1);
  }
  return Default4(schema, path4, value2);
}
function Visit12(schema, references, path4, value2) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema[Kind]) {
    case "Array":
      return FromArray12(schema_, references_, path4, value2);
    case "Import":
      return FromImport8(schema_, references_, path4, value2);
    case "Intersect":
      return FromIntersect11(schema_, references_, path4, value2);
    case "Not":
      return FromNot6(schema_, references_, path4, value2);
    case "Object":
      return FromObject10(schema_, references_, path4, value2);
    case "Record":
      return FromRecord9(schema_, references_, path4, value2);
    case "Ref":
      return FromRef9(schema_, references_, path4, value2);
    case "This":
      return FromThis8(schema_, references_, path4, value2);
    case "Tuple":
      return FromTuple11(schema_, references_, path4, value2);
    case "Union":
      return FromUnion13(schema_, references_, path4, value2);
    default:
      return Default4(schema_, path4, value2);
  }
}
function TransformEncode(schema, references, value2) {
  return Visit12(schema, references, "", value2);
}

// node_modules/@sinclair/typebox/build/esm/value/transform/has.mjs
function FromArray13(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromAsyncIterator5(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromConstructor6(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromFunction5(schema, references) {
  return IsTransform(schema) || Visit13(schema.returns, references) || schema.parameters.some((schema2) => Visit13(schema2, references));
}
function FromIntersect12(schema, references) {
  return IsTransform(schema) || IsTransform(schema.unevaluatedProperties) || schema.allOf.some((schema2) => Visit13(schema2, references));
}
function FromImport9(schema, references) {
  const additional = globalThis.Object.getOwnPropertyNames(schema.$defs).reduce((result, key) => [...result, schema.$defs[key]], []);
  const target = schema.$defs[schema.$ref];
  return IsTransform(schema) || Visit13(target, [...additional, ...references]);
}
function FromIterator5(schema, references) {
  return IsTransform(schema) || Visit13(schema.items, references);
}
function FromNot7(schema, references) {
  return IsTransform(schema) || Visit13(schema.not, references);
}
function FromObject11(schema, references) {
  return IsTransform(schema) || Object.values(schema.properties).some((schema2) => Visit13(schema2, references)) || IsSchema(schema.additionalProperties) && Visit13(schema.additionalProperties, references);
}
function FromPromise5(schema, references) {
  return IsTransform(schema) || Visit13(schema.item, references);
}
function FromRecord10(schema, references) {
  const pattern = Object.getOwnPropertyNames(schema.patternProperties)[0];
  const property = schema.patternProperties[pattern];
  return IsTransform(schema) || Visit13(property, references) || IsSchema(schema.additionalProperties) && IsTransform(schema.additionalProperties);
}
function FromRef10(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromThis9(schema, references) {
  if (IsTransform(schema))
    return true;
  return Visit13(Deref(schema, references), references);
}
function FromTuple12(schema, references) {
  return IsTransform(schema) || !IsUndefined(schema.items) && schema.items.some((schema2) => Visit13(schema2, references));
}
function FromUnion14(schema, references) {
  return IsTransform(schema) || schema.anyOf.some((schema2) => Visit13(schema2, references));
}
function Visit13(schema, references) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  if (schema.$id && visited.has(schema.$id))
    return false;
  if (schema.$id)
    visited.add(schema.$id);
  switch (schema[Kind]) {
    case "Array":
      return FromArray13(schema_, references_);
    case "AsyncIterator":
      return FromAsyncIterator5(schema_, references_);
    case "Constructor":
      return FromConstructor6(schema_, references_);
    case "Function":
      return FromFunction5(schema_, references_);
    case "Import":
      return FromImport9(schema_, references_);
    case "Intersect":
      return FromIntersect12(schema_, references_);
    case "Iterator":
      return FromIterator5(schema_, references_);
    case "Not":
      return FromNot7(schema_, references_);
    case "Object":
      return FromObject11(schema_, references_);
    case "Promise":
      return FromPromise5(schema_, references_);
    case "Record":
      return FromRecord10(schema_, references_);
    case "Ref":
      return FromRef10(schema_, references_);
    case "This":
      return FromThis9(schema_, references_);
    case "Tuple":
      return FromTuple12(schema_, references_);
    case "Union":
      return FromUnion14(schema_, references_);
    default:
      return IsTransform(schema);
  }
}
var visited = /* @__PURE__ */ new Set();
function HasTransform(schema, references) {
  visited.clear();
  return Visit13(schema, references);
}

// node_modules/@sinclair/typebox/build/esm/value/decode/decode.mjs
function Decode(...args) {
  const [schema, references, value2] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  if (!Check(schema, references, value2))
    throw new TransformDecodeCheckError(schema, value2, Errors(schema, references, value2).First());
  return HasTransform(schema, references) ? TransformDecode(schema, references, value2) : value2;
}

// node_modules/@sinclair/typebox/build/esm/value/default/default.mjs
function ValueOrDefault(schema, value2) {
  const defaultValue = HasPropertyKey(schema, "default") ? schema.default : void 0;
  const clone = IsFunction(defaultValue) ? defaultValue() : Clone2(defaultValue);
  return IsUndefined(value2) ? clone : IsObject(value2) && IsObject(clone) ? Object.assign(clone, value2) : value2;
}
function HasDefaultProperty(schema) {
  return IsKind(schema) && "default" in schema;
}
function FromArray14(schema, references, value2) {
  if (IsArray(value2)) {
    for (let i = 0; i < value2.length; i++) {
      value2[i] = Visit14(schema.items, references, value2[i]);
    }
    return value2;
  }
  const defaulted = ValueOrDefault(schema, value2);
  if (!IsArray(defaulted))
    return defaulted;
  for (let i = 0; i < defaulted.length; i++) {
    defaulted[i] = Visit14(schema.items, references, defaulted[i]);
  }
  return defaulted;
}
function FromDate7(schema, references, value2) {
  return IsDate(value2) ? value2 : ValueOrDefault(schema, value2);
}
function FromImport10(schema, references, value2) {
  const definitions = globalThis.Object.values(schema.$defs);
  const target = schema.$defs[schema.$ref];
  return Visit14(target, [...references, ...definitions], value2);
}
function FromIntersect13(schema, references, value2) {
  const defaulted = ValueOrDefault(schema, value2);
  return schema.allOf.reduce((acc, schema2) => {
    const next = Visit14(schema2, references, defaulted);
    return IsObject(next) ? { ...acc, ...next } : next;
  }, {});
}
function FromObject12(schema, references, value2) {
  const defaulted = ValueOrDefault(schema, value2);
  if (!IsObject(defaulted))
    return defaulted;
  const knownPropertyKeys = Object.getOwnPropertyNames(schema.properties);
  for (const key of knownPropertyKeys) {
    const propertyValue = Visit14(schema.properties[key], references, defaulted[key]);
    if (IsUndefined(propertyValue))
      continue;
    defaulted[key] = Visit14(schema.properties[key], references, defaulted[key]);
  }
  if (!HasDefaultProperty(schema.additionalProperties))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKeys.includes(key))
      continue;
    defaulted[key] = Visit14(schema.additionalProperties, references, defaulted[key]);
  }
  return defaulted;
}
function FromRecord11(schema, references, value2) {
  const defaulted = ValueOrDefault(schema, value2);
  if (!IsObject(defaulted))
    return defaulted;
  const additionalPropertiesSchema = schema.additionalProperties;
  const [propertyKeyPattern, propertySchema] = Object.entries(schema.patternProperties)[0];
  const knownPropertyKey = new RegExp(propertyKeyPattern);
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (!(knownPropertyKey.test(key) && HasDefaultProperty(propertySchema)))
      continue;
    defaulted[key] = Visit14(propertySchema, references, defaulted[key]);
  }
  if (!HasDefaultProperty(additionalPropertiesSchema))
    return defaulted;
  for (const key of Object.getOwnPropertyNames(defaulted)) {
    if (knownPropertyKey.test(key))
      continue;
    defaulted[key] = Visit14(additionalPropertiesSchema, references, defaulted[key]);
  }
  return defaulted;
}
function FromRef11(schema, references, value2) {
  return Visit14(Deref(schema, references), references, ValueOrDefault(schema, value2));
}
function FromThis10(schema, references, value2) {
  return Visit14(Deref(schema, references), references, value2);
}
function FromTuple13(schema, references, value2) {
  const defaulted = ValueOrDefault(schema, value2);
  if (!IsArray(defaulted) || IsUndefined(schema.items))
    return defaulted;
  const [items, max] = [schema.items, Math.max(schema.items.length, defaulted.length)];
  for (let i = 0; i < max; i++) {
    if (i < items.length)
      defaulted[i] = Visit14(items[i], references, defaulted[i]);
  }
  return defaulted;
}
function FromUnion15(schema, references, value2) {
  const defaulted = ValueOrDefault(schema, value2);
  for (const inner of schema.anyOf) {
    const result = Visit14(inner, references, Clone2(defaulted));
    if (Check(inner, references, result)) {
      return result;
    }
  }
  return defaulted;
}
function Visit14(schema, references, value2) {
  const references_ = Pushref(schema, references);
  const schema_ = schema;
  switch (schema_[Kind]) {
    case "Array":
      return FromArray14(schema_, references_, value2);
    case "Date":
      return FromDate7(schema_, references_, value2);
    case "Import":
      return FromImport10(schema_, references_, value2);
    case "Intersect":
      return FromIntersect13(schema_, references_, value2);
    case "Object":
      return FromObject12(schema_, references_, value2);
    case "Record":
      return FromRecord11(schema_, references_, value2);
    case "Ref":
      return FromRef11(schema_, references_, value2);
    case "This":
      return FromThis10(schema_, references_, value2);
    case "Tuple":
      return FromTuple13(schema_, references_, value2);
    case "Union":
      return FromUnion15(schema_, references_, value2);
    default:
      return ValueOrDefault(schema_, value2);
  }
}
function Default5(...args) {
  return args.length === 3 ? Visit14(args[0], args[1], args[2]) : Visit14(args[0], [], args[1]);
}

// node_modules/@sinclair/typebox/build/esm/value/pointer/pointer.mjs
var pointer_exports = {};
__export(pointer_exports, {
  Delete: () => Delete3,
  Format: () => Format,
  Get: () => Get3,
  Has: () => Has3,
  Set: () => Set4,
  ValuePointerRootDeleteError: () => ValuePointerRootDeleteError,
  ValuePointerRootSetError: () => ValuePointerRootSetError
});
var ValuePointerRootSetError = class extends TypeBoxError {
  constructor(value2, path4, update) {
    super("Cannot set root value");
    this.value = value2;
    this.path = path4;
    this.update = update;
  }
};
var ValuePointerRootDeleteError = class extends TypeBoxError {
  constructor(value2, path4) {
    super("Cannot delete root value");
    this.value = value2;
    this.path = path4;
  }
};
function Escape2(component) {
  return component.indexOf("~") === -1 ? component : component.replace(/~1/g, "/").replace(/~0/g, "~");
}
function* Format(pointer) {
  if (pointer === "")
    return;
  let [start, end] = [0, 0];
  for (let i = 0; i < pointer.length; i++) {
    const char = pointer.charAt(i);
    if (char === "/") {
      if (i === 0) {
        start = i + 1;
      } else {
        end = i;
        yield Escape2(pointer.slice(start, end));
        start = i + 1;
      }
    } else {
      end = i;
    }
  }
  yield Escape2(pointer.slice(start));
}
function Set4(value2, pointer, update) {
  if (pointer === "")
    throw new ValuePointerRootSetError(value2, pointer, update);
  let [owner, next, key] = [null, value2, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0)
      next[component] = {};
    owner = next;
    next = next[component];
    key = component;
  }
  owner[key] = update;
}
function Delete3(value2, pointer) {
  if (pointer === "")
    throw new ValuePointerRootDeleteError(value2, pointer);
  let [owner, next, key] = [null, value2, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0 || next[component] === null)
      return;
    owner = next;
    next = next[component];
    key = component;
  }
  if (Array.isArray(owner)) {
    const index = parseInt(key);
    owner.splice(index, 1);
  } else {
    delete owner[key];
  }
}
function Has3(value2, pointer) {
  if (pointer === "")
    return true;
  let [owner, next, key] = [null, value2, ""];
  for (const component of Format(pointer)) {
    if (next[component] === void 0)
      return false;
    owner = next;
    next = next[component];
    key = component;
  }
  return Object.getOwnPropertyNames(owner).includes(key);
}
function Get3(value2, pointer) {
  if (pointer === "")
    return value2;
  let current = value2;
  for (const component of Format(pointer)) {
    if (current[component] === void 0)
      return void 0;
    current = current[component];
  }
  return current;
}

// node_modules/@sinclair/typebox/build/esm/value/equal/equal.mjs
function ObjectType3(left, right) {
  if (!IsObject(right))
    return false;
  const leftKeys = [...Object.keys(left), ...Object.getOwnPropertySymbols(left)];
  const rightKeys = [...Object.keys(right), ...Object.getOwnPropertySymbols(right)];
  if (leftKeys.length !== rightKeys.length)
    return false;
  return leftKeys.every((key) => Equal(left[key], right[key]));
}
function DateType3(left, right) {
  return IsDate(right) && left.getTime() === right.getTime();
}
function ArrayType3(left, right) {
  if (!IsArray(right) || left.length !== right.length)
    return false;
  return left.every((value2, index) => Equal(value2, right[index]));
}
function TypedArrayType(left, right) {
  if (!IsTypedArray(right) || left.length !== right.length || Object.getPrototypeOf(left).constructor.name !== Object.getPrototypeOf(right).constructor.name)
    return false;
  return left.every((value2, index) => Equal(value2, right[index]));
}
function ValueType(left, right) {
  return left === right;
}
function Equal(left, right) {
  if (IsDate(left))
    return DateType3(left, right);
  if (IsTypedArray(left))
    return TypedArrayType(left, right);
  if (IsArray(left))
    return ArrayType3(left, right);
  if (IsObject(left))
    return ObjectType3(left, right);
  if (IsValueType(left))
    return ValueType(left, right);
  throw new Error("ValueEquals: Unable to compare value");
}

// node_modules/@sinclair/typebox/build/esm/value/delta/delta.mjs
var Insert = Object2({
  type: Literal("insert"),
  path: String2(),
  value: Unknown()
});
var Update = Object2({
  type: Literal("update"),
  path: String2(),
  value: Unknown()
});
var Delete4 = Object2({
  type: Literal("delete"),
  path: String2()
});
var Edit = Union([Insert, Update, Delete4]);
var ValueDiffError = class extends TypeBoxError {
  constructor(value2, message) {
    super(message);
    this.value = value2;
  }
};
function CreateUpdate(path4, value2) {
  return { type: "update", path: path4, value: value2 };
}
function CreateInsert(path4, value2) {
  return { type: "insert", path: path4, value: value2 };
}
function CreateDelete(path4) {
  return { type: "delete", path: path4 };
}
function AssertDiffable(value2) {
  if (globalThis.Object.getOwnPropertySymbols(value2).length > 0)
    throw new ValueDiffError(value2, "Cannot diff objects with symbols");
}
function* ObjectType4(path4, current, next) {
  AssertDiffable(current);
  AssertDiffable(next);
  if (!IsStandardObject(next))
    return yield CreateUpdate(path4, next);
  const currentKeys = globalThis.Object.getOwnPropertyNames(current);
  const nextKeys = globalThis.Object.getOwnPropertyNames(next);
  for (const key of nextKeys) {
    if (HasPropertyKey(current, key))
      continue;
    yield CreateInsert(`${path4}/${key}`, next[key]);
  }
  for (const key of currentKeys) {
    if (!HasPropertyKey(next, key))
      continue;
    if (Equal(current, next))
      continue;
    yield* Visit15(`${path4}/${key}`, current[key], next[key]);
  }
  for (const key of currentKeys) {
    if (HasPropertyKey(next, key))
      continue;
    yield CreateDelete(`${path4}/${key}`);
  }
}
function* ArrayType4(path4, current, next) {
  if (!IsArray(next))
    return yield CreateUpdate(path4, next);
  for (let i = 0; i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path4}/${i}`, current[i], next[i]);
  }
  for (let i = 0; i < next.length; i++) {
    if (i < current.length)
      continue;
    yield CreateInsert(`${path4}/${i}`, next[i]);
  }
  for (let i = current.length - 1; i >= 0; i--) {
    if (i < next.length)
      continue;
    yield CreateDelete(`${path4}/${i}`);
  }
}
function* TypedArrayType2(path4, current, next) {
  if (!IsTypedArray(next) || current.length !== next.length || globalThis.Object.getPrototypeOf(current).constructor.name !== globalThis.Object.getPrototypeOf(next).constructor.name)
    return yield CreateUpdate(path4, next);
  for (let i = 0; i < Math.min(current.length, next.length); i++) {
    yield* Visit15(`${path4}/${i}`, current[i], next[i]);
  }
}
function* ValueType2(path4, current, next) {
  if (current === next)
    return;
  yield CreateUpdate(path4, next);
}
function* Visit15(path4, current, next) {
  if (IsStandardObject(current))
    return yield* ObjectType4(path4, current, next);
  if (IsArray(current))
    return yield* ArrayType4(path4, current, next);
  if (IsTypedArray(current))
    return yield* TypedArrayType2(path4, current, next);
  if (IsValueType(current))
    return yield* ValueType2(path4, current, next);
  throw new ValueDiffError(current, "Unable to diff value");
}
function Diff(current, next) {
  return [...Visit15("", current, next)];
}
function IsRootUpdate(edits) {
  return edits.length > 0 && edits[0].path === "" && edits[0].type === "update";
}
function IsIdentity(edits) {
  return edits.length === 0;
}
function Patch(current, edits) {
  if (IsRootUpdate(edits)) {
    return Clone2(edits[0].value);
  }
  if (IsIdentity(edits)) {
    return Clone2(current);
  }
  const clone = Clone2(current);
  for (const edit of edits) {
    switch (edit.type) {
      case "insert": {
        pointer_exports.Set(clone, edit.path, edit.value);
        break;
      }
      case "update": {
        pointer_exports.Set(clone, edit.path, edit.value);
        break;
      }
      case "delete": {
        pointer_exports.Delete(clone, edit.path);
        break;
      }
    }
  }
  return clone;
}

// node_modules/@sinclair/typebox/build/esm/value/encode/encode.mjs
function Encode(...args) {
  const [schema, references, value2] = args.length === 3 ? [args[0], args[1], args[2]] : [args[0], [], args[1]];
  const encoded = HasTransform(schema, references) ? TransformEncode(schema, references, value2) : value2;
  if (!Check(schema, references, encoded))
    throw new TransformEncodeCheckError(schema, encoded, Errors(schema, references, encoded).First());
  return encoded;
}

// node_modules/@sinclair/typebox/build/esm/value/mutate/mutate.mjs
function IsStandardObject2(value2) {
  return IsObject(value2) && !IsArray(value2);
}
var ValueMutateError = class extends TypeBoxError {
  constructor(message) {
    super(message);
  }
};
function ObjectType5(root, path4, current, next) {
  if (!IsStandardObject2(current)) {
    pointer_exports.Set(root, path4, Clone2(next));
  } else {
    const currentKeys = Object.getOwnPropertyNames(current);
    const nextKeys = Object.getOwnPropertyNames(next);
    for (const currentKey of currentKeys) {
      if (!nextKeys.includes(currentKey)) {
        delete current[currentKey];
      }
    }
    for (const nextKey of nextKeys) {
      if (!currentKeys.includes(nextKey)) {
        current[nextKey] = null;
      }
    }
    for (const nextKey of nextKeys) {
      Visit16(root, `${path4}/${nextKey}`, current[nextKey], next[nextKey]);
    }
  }
}
function ArrayType5(root, path4, current, next) {
  if (!IsArray(current)) {
    pointer_exports.Set(root, path4, Clone2(next));
  } else {
    for (let index = 0; index < next.length; index++) {
      Visit16(root, `${path4}/${index}`, current[index], next[index]);
    }
    current.splice(next.length);
  }
}
function TypedArrayType3(root, path4, current, next) {
  if (IsTypedArray(current) && current.length === next.length) {
    for (let i = 0; i < current.length; i++) {
      current[i] = next[i];
    }
  } else {
    pointer_exports.Set(root, path4, Clone2(next));
  }
}
function ValueType3(root, path4, current, next) {
  if (current === next)
    return;
  pointer_exports.Set(root, path4, next);
}
function Visit16(root, path4, current, next) {
  if (IsArray(next))
    return ArrayType5(root, path4, current, next);
  if (IsTypedArray(next))
    return TypedArrayType3(root, path4, current, next);
  if (IsStandardObject2(next))
    return ObjectType5(root, path4, current, next);
  if (IsValueType(next))
    return ValueType3(root, path4, current, next);
}
function IsNonMutableValue(value2) {
  return IsTypedArray(value2) || IsValueType(value2);
}
function IsMismatchedValue(current, next) {
  return IsStandardObject2(current) && IsArray(next) || IsArray(current) && IsStandardObject2(next);
}
function Mutate(current, next) {
  if (IsNonMutableValue(current) || IsNonMutableValue(next))
    throw new ValueMutateError("Only object and array types can be mutated at the root level");
  if (IsMismatchedValue(current, next))
    throw new ValueMutateError("Cannot assign due type mismatch of assignable values");
  Visit16(current, "", current, next);
}

// node_modules/@sinclair/typebox/build/esm/value/parse/parse.mjs
var ParseError = class extends TypeBoxError {
  constructor(message) {
    super(message);
  }
};
var ParseRegistry;
(function(ParseRegistry2) {
  const registry = /* @__PURE__ */ new Map([
    ["Assert", (type, references, value2) => {
      Assert(type, references, value2);
      return value2;
    }],
    ["Cast", (type, references, value2) => Cast(type, references, value2)],
    ["Clean", (type, references, value2) => Clean(type, references, value2)],
    ["Clone", (_type, _references, value2) => Clone2(value2)],
    ["Convert", (type, references, value2) => Convert(type, references, value2)],
    ["Decode", (type, references, value2) => HasTransform(type, references) ? TransformDecode(type, references, value2) : value2],
    ["Default", (type, references, value2) => Default5(type, references, value2)],
    ["Encode", (type, references, value2) => HasTransform(type, references) ? TransformEncode(type, references, value2) : value2]
  ]);
  function Delete5(key) {
    registry.delete(key);
  }
  ParseRegistry2.Delete = Delete5;
  function Set5(key, callback) {
    registry.set(key, callback);
  }
  ParseRegistry2.Set = Set5;
  function Get4(key) {
    return registry.get(key);
  }
  ParseRegistry2.Get = Get4;
})(ParseRegistry || (ParseRegistry = {}));
var ParseDefault = [
  "Clone",
  "Clean",
  "Default",
  "Convert",
  "Assert",
  "Decode"
];
function ParseValue(operations, type, references, value2) {
  return operations.reduce((value3, operationKey) => {
    const operation2 = ParseRegistry.Get(operationKey);
    if (IsUndefined(operation2))
      throw new ParseError(`Unable to find Parse operation '${operationKey}'`);
    return operation2(type, references, value3);
  }, value2);
}
function Parse(...args) {
  const [operations, schema, references, value2] = args.length === 4 ? [args[0], args[1], args[2], args[3]] : args.length === 3 ? IsArray(args[0]) ? [args[0], args[1], [], args[2]] : [ParseDefault, args[0], args[1], args[2]] : args.length === 2 ? [ParseDefault, args[0], [], args[1]] : (() => {
    throw new ParseError("Invalid Arguments");
  })();
  return ParseValue(operations, schema, references, value2);
}

// node_modules/@sinclair/typebox/build/esm/value/value/value.mjs
var value_exports2 = {};
__export(value_exports2, {
  Assert: () => Assert,
  Cast: () => Cast,
  Check: () => Check,
  Clean: () => Clean,
  Clone: () => Clone2,
  Convert: () => Convert,
  Create: () => Create2,
  Decode: () => Decode,
  Default: () => Default5,
  Diff: () => Diff,
  Edit: () => Edit,
  Encode: () => Encode,
  Equal: () => Equal,
  Errors: () => Errors,
  Hash: () => Hash,
  Mutate: () => Mutate,
  Parse: () => Parse,
  Patch: () => Patch,
  ValueErrorIterator: () => ValueErrorIterator
});

// plugins/omlx-media/src/domain.ts
var OmlxToolError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "OmlxToolError";
    this.code = code;
  }
};

// node_modules/@sinclair/typebox/build/esm/type/clone/type.mjs
function CloneType(schema, options) {
  return options === void 0 ? Clone(schema) : Clone({ ...options, ...schema });
}

// node_modules/@sinclair/typebox/build/esm/type/argument/argument.mjs
function Argument(index) {
  return CreateType({ [Kind]: "Argument", index });
}

// node_modules/@sinclair/typebox/build/esm/type/awaited/awaited.mjs
function FromComputed2(target, parameters) {
  return Computed("Awaited", [Computed(target, parameters)]);
}
function FromRef12($ref) {
  return Computed("Awaited", [Ref($ref)]);
}
function FromIntersect14(types) {
  return Intersect(FromRest4(types));
}
function FromUnion16(types) {
  return Union(FromRest4(types));
}
function FromPromise6(type) {
  return Awaited(type);
}
function FromRest4(types) {
  return types.map((type) => Awaited(type));
}
function Awaited(type, options) {
  return CreateType(IsComputed(type) ? FromComputed2(type.target, type.parameters) : IsIntersect(type) ? FromIntersect14(type.allOf) : IsUnion(type) ? FromUnion16(type.anyOf) : IsPromise2(type) ? FromPromise6(type.item) : IsRef(type) ? FromRef12(type.$ref) : type, options);
}

// node_modules/@sinclair/typebox/build/esm/type/composite/composite.mjs
function CompositeKeys(T) {
  const Acc = [];
  for (const L of T)
    Acc.push(...KeyOfPropertyKeys(L));
  return SetDistinct(Acc);
}
function FilterNever(T) {
  return T.filter((L) => !IsNever(L));
}
function CompositeProperty(T, K) {
  const Acc = [];
  for (const L of T)
    Acc.push(...IndexFromPropertyKeys(L, [K]));
  return FilterNever(Acc);
}
function CompositeProperties(T, K) {
  const Acc = {};
  for (const L of K) {
    Acc[L] = IntersectEvaluated(CompositeProperty(T, L));
  }
  return Acc;
}
function Composite(T, options) {
  const K = CompositeKeys(T);
  const P = CompositeProperties(T, K);
  const R = Object2(P, options);
  return R;
}

// node_modules/@sinclair/typebox/build/esm/type/date/date.mjs
function Date2(options) {
  return CreateType({ [Kind]: "Date", type: "Date" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/null/null.mjs
function Null(options) {
  return CreateType({ [Kind]: "Null", type: "null" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/symbol/symbol.mjs
function Symbol2(options) {
  return CreateType({ [Kind]: "Symbol", type: "symbol" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/undefined/undefined.mjs
function Undefined(options) {
  return CreateType({ [Kind]: "Undefined", type: "undefined" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/uint8array/uint8array.mjs
function Uint8Array2(options) {
  return CreateType({ [Kind]: "Uint8Array", type: "Uint8Array" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/const/const.mjs
function FromArray15(T) {
  return T.map((L) => FromValue2(L, false));
}
function FromProperties8(value2) {
  const Acc = {};
  for (const K of globalThis.Object.getOwnPropertyNames(value2))
    Acc[K] = Readonly(FromValue2(value2[K], false));
  return Acc;
}
function ConditionalReadonly(T, root) {
  return root === true ? T : Readonly(T);
}
function FromValue2(value2, root) {
  return IsAsyncIterator2(value2) ? ConditionalReadonly(Any(), root) : IsIterator2(value2) ? ConditionalReadonly(Any(), root) : IsArray2(value2) ? Readonly(Tuple(FromArray15(value2))) : IsUint8Array2(value2) ? Uint8Array2() : IsDate2(value2) ? Date2() : IsObject2(value2) ? ConditionalReadonly(Object2(FromProperties8(value2)), root) : IsFunction2(value2) ? ConditionalReadonly(Function([], Unknown()), root) : IsUndefined2(value2) ? Undefined() : IsNull2(value2) ? Null() : IsSymbol2(value2) ? Symbol2() : IsBigInt2(value2) ? BigInt2() : IsNumber2(value2) ? Literal(value2) : IsBoolean2(value2) ? Literal(value2) : IsString2(value2) ? Literal(value2) : Object2({});
}
function Const(T, options) {
  return CreateType(FromValue2(T, true), options);
}

// node_modules/@sinclair/typebox/build/esm/type/constructor-parameters/constructor-parameters.mjs
function ConstructorParameters(schema, options) {
  return IsConstructor(schema) ? Tuple(schema.parameters, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/enum/enum.mjs
function Enum(item, options) {
  if (IsUndefined2(item))
    throw new Error("Enum undefined or empty");
  const values1 = globalThis.Object.getOwnPropertyNames(item).filter((key) => isNaN(key)).map((key) => item[key]);
  const values2 = [...new Set(values1)];
  const anyOf = values2.map((value2) => Literal(value2));
  return Union(anyOf, { ...options, [Hint]: "Enum" });
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-template-literal.mjs
function ExcludeFromTemplateLiteral(L, R) {
  return Exclude(TemplateLiteralToUnion(L), R);
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude.mjs
function ExcludeRest(L, R) {
  const excluded = L.filter((inner) => ExtendsCheck(inner, R) === ExtendsResult.False);
  return excluded.length === 1 ? excluded[0] : Union(excluded);
}
function Exclude(L, R, options = {}) {
  if (IsTemplateLiteral(L))
    return CreateType(ExcludeFromTemplateLiteral(L, R), options);
  if (IsMappedResult(L))
    return CreateType(ExcludeFromMappedResult(L, R), options);
  return CreateType(IsUnion(L) ? ExcludeRest(L.anyOf, R) : ExtendsCheck(L, R) !== ExtendsResult.False ? Never() : L, options);
}

// node_modules/@sinclair/typebox/build/esm/type/exclude/exclude-from-mapped-result.mjs
function FromProperties9(P, U) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Exclude(P[K2], U);
  return Acc;
}
function FromMappedResult7(R, T) {
  return FromProperties9(R.properties, T);
}
function ExcludeFromMappedResult(R, T) {
  const P = FromMappedResult7(R, T);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-template-literal.mjs
function ExtractFromTemplateLiteral(L, R) {
  return Extract(TemplateLiteralToUnion(L), R);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract.mjs
function ExtractRest(L, R) {
  const extracted = L.filter((inner) => ExtendsCheck(inner, R) !== ExtendsResult.False);
  return extracted.length === 1 ? extracted[0] : Union(extracted);
}
function Extract(L, R, options) {
  if (IsTemplateLiteral(L))
    return CreateType(ExtractFromTemplateLiteral(L, R), options);
  if (IsMappedResult(L))
    return CreateType(ExtractFromMappedResult(L, R), options);
  return CreateType(IsUnion(L) ? ExtractRest(L.anyOf, R) : ExtendsCheck(L, R) !== ExtendsResult.False ? L : Never(), options);
}

// node_modules/@sinclair/typebox/build/esm/type/extract/extract-from-mapped-result.mjs
function FromProperties10(P, T) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Extract(P[K2], T);
  return Acc;
}
function FromMappedResult8(R, T) {
  return FromProperties10(R.properties, T);
}
function ExtractFromMappedResult(R, T) {
  const P = FromMappedResult8(R, T);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/instance-type/instance-type.mjs
function InstanceType(schema, options) {
  return IsConstructor(schema) ? CreateType(schema.returns, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/readonly-optional/readonly-optional.mjs
function ReadonlyOptional(schema) {
  return Readonly(Optional(schema));
}

// node_modules/@sinclair/typebox/build/esm/type/record/record.mjs
function RecordCreateFromPattern(pattern, T, options) {
  return CreateType({ [Kind]: "Record", type: "object", patternProperties: { [pattern]: T } }, options);
}
function RecordCreateFromKeys(K, T, options) {
  const result = {};
  for (const K2 of K)
    result[K2] = T;
  return Object2(result, { ...options, [Hint]: "Record" });
}
function FromTemplateLiteralKey(K, T, options) {
  return IsTemplateLiteralFinite(K) ? RecordCreateFromKeys(IndexPropertyKeys(K), T, options) : RecordCreateFromPattern(K.pattern, T, options);
}
function FromUnionKey(key, type, options) {
  return RecordCreateFromKeys(IndexPropertyKeys(Union(key)), type, options);
}
function FromLiteralKey(key, type, options) {
  return RecordCreateFromKeys([key.toString()], type, options);
}
function FromRegExpKey(key, type, options) {
  return RecordCreateFromPattern(key.source, type, options);
}
function FromStringKey(key, type, options) {
  const pattern = IsUndefined2(key.pattern) ? PatternStringExact : key.pattern;
  return RecordCreateFromPattern(pattern, type, options);
}
function FromAnyKey(_, type, options) {
  return RecordCreateFromPattern(PatternStringExact, type, options);
}
function FromNeverKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNeverExact, type, options);
}
function FromBooleanKey(_key, type, options) {
  return Object2({ true: type, false: type }, options);
}
function FromIntegerKey(_key, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function FromNumberKey(_, type, options) {
  return RecordCreateFromPattern(PatternNumberExact, type, options);
}
function Record(key, type, options = {}) {
  return IsUnion(key) ? FromUnionKey(key.anyOf, type, options) : IsTemplateLiteral(key) ? FromTemplateLiteralKey(key, type, options) : IsLiteral(key) ? FromLiteralKey(key.const, type, options) : IsBoolean3(key) ? FromBooleanKey(key, type, options) : IsInteger2(key) ? FromIntegerKey(key, type, options) : IsNumber3(key) ? FromNumberKey(key, type, options) : IsRegExp2(key) ? FromRegExpKey(key, type, options) : IsString3(key) ? FromStringKey(key, type, options) : IsAny(key) ? FromAnyKey(key, type, options) : IsNever(key) ? FromNeverKey(key, type, options) : Never(options);
}
function RecordPattern(record) {
  return globalThis.Object.getOwnPropertyNames(record.patternProperties)[0];
}
function RecordKey2(type) {
  const pattern = RecordPattern(type);
  return pattern === PatternStringExact ? String2() : pattern === PatternNumberExact ? Number2() : String2({ pattern });
}
function RecordValue2(type) {
  return type.patternProperties[RecordPattern(type)];
}

// node_modules/@sinclair/typebox/build/esm/type/instantiate/instantiate.mjs
function FromConstructor7(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromFunction6(args, type) {
  type.parameters = FromTypes(args, type.parameters);
  type.returns = FromType(args, type.returns);
  return type;
}
function FromIntersect15(args, type) {
  type.allOf = FromTypes(args, type.allOf);
  return type;
}
function FromUnion17(args, type) {
  type.anyOf = FromTypes(args, type.anyOf);
  return type;
}
function FromTuple14(args, type) {
  if (IsUndefined2(type.items))
    return type;
  type.items = FromTypes(args, type.items);
  return type;
}
function FromArray16(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromAsyncIterator6(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromIterator6(args, type) {
  type.items = FromType(args, type.items);
  return type;
}
function FromPromise7(args, type) {
  type.item = FromType(args, type.item);
  return type;
}
function FromObject13(args, type) {
  const mappedProperties = FromProperties11(args, type.properties);
  return { ...type, ...Object2(mappedProperties) };
}
function FromRecord12(args, type) {
  const mappedKey = FromType(args, RecordKey2(type));
  const mappedValue = FromType(args, RecordValue2(type));
  const result = Record(mappedKey, mappedValue);
  return { ...type, ...result };
}
function FromArgument4(args, argument) {
  return argument.index in args ? args[argument.index] : Unknown();
}
function FromProperty2(args, type) {
  const isReadonly = IsReadonly(type);
  const isOptional = IsOptional(type);
  const mapped = FromType(args, type);
  return isReadonly && isOptional ? ReadonlyOptional(mapped) : isReadonly && !isOptional ? Readonly(mapped) : !isReadonly && isOptional ? Optional(mapped) : mapped;
}
function FromProperties11(args, properties) {
  return globalThis.Object.getOwnPropertyNames(properties).reduce((result, key) => {
    return { ...result, [key]: FromProperty2(args, properties[key]) };
  }, {});
}
function FromTypes(args, types) {
  return types.map((type) => FromType(args, type));
}
function FromType(args, type) {
  return IsConstructor(type) ? FromConstructor7(args, type) : IsFunction3(type) ? FromFunction6(args, type) : IsIntersect(type) ? FromIntersect15(args, type) : IsUnion(type) ? FromUnion17(args, type) : IsTuple(type) ? FromTuple14(args, type) : IsArray3(type) ? FromArray16(args, type) : IsAsyncIterator3(type) ? FromAsyncIterator6(args, type) : IsIterator3(type) ? FromIterator6(args, type) : IsPromise2(type) ? FromPromise7(args, type) : IsObject3(type) ? FromObject13(args, type) : IsRecord(type) ? FromRecord12(args, type) : IsArgument(type) ? FromArgument4(args, type) : type;
}
function Instantiate(type, args) {
  return FromType(args, CloneType(type));
}

// node_modules/@sinclair/typebox/build/esm/type/integer/integer.mjs
function Integer(options) {
  return CreateType({ [Kind]: "Integer", type: "integer" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic-from-mapped-key.mjs
function MappedIntrinsicPropertyKey(K, M, options) {
  return {
    [K]: Intrinsic(Literal(K), M, Clone(options))
  };
}
function MappedIntrinsicPropertyKeys(K, M, options) {
  const result = K.reduce((Acc, L) => {
    return { ...Acc, ...MappedIntrinsicPropertyKey(L, M, options) };
  }, {});
  return result;
}
function MappedIntrinsicProperties(T, M, options) {
  return MappedIntrinsicPropertyKeys(T["keys"], M, options);
}
function IntrinsicFromMappedKey(T, M, options) {
  const P = MappedIntrinsicProperties(T, M, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/intrinsic.mjs
function ApplyUncapitalize(value2) {
  const [first, rest] = [value2.slice(0, 1), value2.slice(1)];
  return [first.toLowerCase(), rest].join("");
}
function ApplyCapitalize(value2) {
  const [first, rest] = [value2.slice(0, 1), value2.slice(1)];
  return [first.toUpperCase(), rest].join("");
}
function ApplyUppercase(value2) {
  return value2.toUpperCase();
}
function ApplyLowercase(value2) {
  return value2.toLowerCase();
}
function FromTemplateLiteral6(schema, mode, options) {
  const expression = TemplateLiteralParseExact(schema.pattern);
  const finite = IsTemplateLiteralExpressionFinite(expression);
  if (!finite)
    return { ...schema, pattern: FromLiteralValue(schema.pattern, mode) };
  const strings = [...TemplateLiteralExpressionGenerate(expression)];
  const literals = strings.map((value2) => Literal(value2));
  const mapped = FromRest5(literals, mode);
  const union = Union(mapped);
  return TemplateLiteral([union], options);
}
function FromLiteralValue(value2, mode) {
  return typeof value2 === "string" ? mode === "Uncapitalize" ? ApplyUncapitalize(value2) : mode === "Capitalize" ? ApplyCapitalize(value2) : mode === "Uppercase" ? ApplyUppercase(value2) : mode === "Lowercase" ? ApplyLowercase(value2) : value2 : value2.toString();
}
function FromRest5(T, M) {
  return T.map((L) => Intrinsic(L, M));
}
function Intrinsic(schema, mode, options = {}) {
  return (
    // Intrinsic-Mapped-Inference
    IsMappedKey(schema) ? IntrinsicFromMappedKey(schema, mode, options) : (
      // Standard-Inference
      IsTemplateLiteral(schema) ? FromTemplateLiteral6(schema, mode, options) : IsUnion(schema) ? Union(FromRest5(schema.anyOf, mode), options) : IsLiteral(schema) ? Literal(FromLiteralValue(schema.const, mode), options) : (
        // Default Type
        CreateType(schema, options)
      )
    )
  );
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/capitalize.mjs
function Capitalize(T, options = {}) {
  return Intrinsic(T, "Capitalize", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/lowercase.mjs
function Lowercase(T, options = {}) {
  return Intrinsic(T, "Lowercase", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/uncapitalize.mjs
function Uncapitalize(T, options = {}) {
  return Intrinsic(T, "Uncapitalize", options);
}

// node_modules/@sinclair/typebox/build/esm/type/intrinsic/uppercase.mjs
function Uppercase(T, options = {}) {
  return Intrinsic(T, "Uppercase", options);
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-result.mjs
function FromProperties12(properties, propertyKeys, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = Omit(properties[K2], propertyKeys, Clone(options));
  return result;
}
function FromMappedResult9(mappedResult, propertyKeys, options) {
  return FromProperties12(mappedResult.properties, propertyKeys, options);
}
function OmitFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult9(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit.mjs
function FromIntersect16(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromUnion18(types, propertyKeys) {
  return types.map((type) => OmitResolve(type, propertyKeys));
}
function FromProperty3(properties, key) {
  const { [key]: _, ...R } = properties;
  return R;
}
function FromProperties13(properties, propertyKeys) {
  return propertyKeys.reduce((T, K2) => FromProperty3(T, K2), properties);
}
function FromObject14(type, propertyKeys, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties13(properties, propertyKeys);
  return Object2(mappedProperties, options);
}
function UnionFromPropertyKeys(propertyKeys) {
  const result = propertyKeys.reduce((result2, key) => IsLiteralValue(key) ? [...result2, Literal(key)] : result2, []);
  return Union(result);
}
function OmitResolve(type, propertyKeys) {
  return IsIntersect(type) ? Intersect(FromIntersect16(type.allOf, propertyKeys)) : IsUnion(type) ? Union(FromUnion18(type.anyOf, propertyKeys)) : IsObject3(type) ? FromObject14(type, propertyKeys, type.properties) : Object2({});
}
function Omit(type, key, options) {
  const typeKey = IsArray2(key) ? UnionFromPropertyKeys(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? OmitFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? OmitFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Omit", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Omit", [type, typeKey], options) : CreateType({ ...OmitResolve(type, propertyKeys), ...options });
}

// node_modules/@sinclair/typebox/build/esm/type/omit/omit-from-mapped-key.mjs
function FromPropertyKey2(type, key, options) {
  return { [key]: Omit(type, [key], Clone(options)) };
}
function FromPropertyKeys2(type, propertyKeys, options) {
  return propertyKeys.reduce((Acc, LK) => {
    return { ...Acc, ...FromPropertyKey2(type, LK, options) };
  }, {});
}
function FromMappedKey3(type, mappedKey, options) {
  return FromPropertyKeys2(type, mappedKey.keys, options);
}
function OmitFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey3(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-result.mjs
function FromProperties14(properties, propertyKeys, options) {
  const result = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(properties))
    result[K2] = Pick(properties[K2], propertyKeys, Clone(options));
  return result;
}
function FromMappedResult10(mappedResult, propertyKeys, options) {
  return FromProperties14(mappedResult.properties, propertyKeys, options);
}
function PickFromMappedResult(mappedResult, propertyKeys, options) {
  const properties = FromMappedResult10(mappedResult, propertyKeys, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick.mjs
function FromIntersect17(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromUnion19(types, propertyKeys) {
  return types.map((type) => PickResolve(type, propertyKeys));
}
function FromProperties15(properties, propertyKeys) {
  const result = {};
  for (const K2 of propertyKeys)
    if (K2 in properties)
      result[K2] = properties[K2];
  return result;
}
function FromObject15(Type2, keys, properties) {
  const options = Discard(Type2, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties15(properties, keys);
  return Object2(mappedProperties, options);
}
function UnionFromPropertyKeys2(propertyKeys) {
  const result = propertyKeys.reduce((result2, key) => IsLiteralValue(key) ? [...result2, Literal(key)] : result2, []);
  return Union(result);
}
function PickResolve(type, propertyKeys) {
  return IsIntersect(type) ? Intersect(FromIntersect17(type.allOf, propertyKeys)) : IsUnion(type) ? Union(FromUnion19(type.anyOf, propertyKeys)) : IsObject3(type) ? FromObject15(type, propertyKeys, type.properties) : Object2({});
}
function Pick(type, key, options) {
  const typeKey = IsArray2(key) ? UnionFromPropertyKeys2(key) : key;
  const propertyKeys = IsSchema(key) ? IndexPropertyKeys(key) : key;
  const isTypeRef = IsRef(type);
  const isKeyRef = IsRef(key);
  return IsMappedResult(type) ? PickFromMappedResult(type, propertyKeys, options) : IsMappedKey(key) ? PickFromMappedKey(type, key, options) : isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : !isTypeRef && isKeyRef ? Computed("Pick", [type, typeKey], options) : isTypeRef && !isKeyRef ? Computed("Pick", [type, typeKey], options) : CreateType({ ...PickResolve(type, propertyKeys), ...options });
}

// node_modules/@sinclair/typebox/build/esm/type/pick/pick-from-mapped-key.mjs
function FromPropertyKey3(type, key, options) {
  return {
    [key]: Pick(type, [key], Clone(options))
  };
}
function FromPropertyKeys3(type, propertyKeys, options) {
  return propertyKeys.reduce((result, leftKey) => {
    return { ...result, ...FromPropertyKey3(type, leftKey, options) };
  }, {});
}
function FromMappedKey4(type, mappedKey, options) {
  return FromPropertyKeys3(type, mappedKey.keys, options);
}
function PickFromMappedKey(type, mappedKey, options) {
  const properties = FromMappedKey4(type, mappedKey, options);
  return MappedResult(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/partial/partial.mjs
function FromComputed3(target, parameters) {
  return Computed("Partial", [Computed(target, parameters)]);
}
function FromRef13($ref) {
  return Computed("Partial", [Ref($ref)]);
}
function FromProperties16(properties) {
  const partialProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    partialProperties[K] = Optional(properties[K]);
  return partialProperties;
}
function FromObject16(type, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties16(properties);
  return Object2(mappedProperties, options);
}
function FromRest6(types) {
  return types.map((type) => PartialResolve(type));
}
function PartialResolve(type) {
  return (
    // Mappable
    IsComputed(type) ? FromComputed3(type.target, type.parameters) : IsRef(type) ? FromRef13(type.$ref) : IsIntersect(type) ? Intersect(FromRest6(type.allOf)) : IsUnion(type) ? Union(FromRest6(type.anyOf)) : IsObject3(type) ? FromObject16(type, type.properties) : (
      // Intrinsic
      IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : (
        // Passthrough
        Object2({})
      )
    )
  );
}
function Partial(type, options) {
  if (IsMappedResult(type)) {
    return PartialFromMappedResult(type, options);
  } else {
    return CreateType({ ...PartialResolve(type), ...options });
  }
}

// node_modules/@sinclair/typebox/build/esm/type/partial/partial-from-mapped-result.mjs
function FromProperties17(K, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(K))
    Acc[K2] = Partial(K[K2], Clone(options));
  return Acc;
}
function FromMappedResult11(R, options) {
  return FromProperties17(R.properties, options);
}
function PartialFromMappedResult(R, options) {
  const P = FromMappedResult11(R, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/required/required.mjs
function FromComputed4(target, parameters) {
  return Computed("Required", [Computed(target, parameters)]);
}
function FromRef14($ref) {
  return Computed("Required", [Ref($ref)]);
}
function FromProperties18(properties) {
  const requiredProperties = {};
  for (const K of globalThis.Object.getOwnPropertyNames(properties))
    requiredProperties[K] = Discard(properties[K], [OptionalKind]);
  return requiredProperties;
}
function FromObject17(type, properties) {
  const options = Discard(type, [TransformKind, "$id", "required", "properties"]);
  const mappedProperties = FromProperties18(properties);
  return Object2(mappedProperties, options);
}
function FromRest7(types) {
  return types.map((type) => RequiredResolve(type));
}
function RequiredResolve(type) {
  return (
    // Mappable
    IsComputed(type) ? FromComputed4(type.target, type.parameters) : IsRef(type) ? FromRef14(type.$ref) : IsIntersect(type) ? Intersect(FromRest7(type.allOf)) : IsUnion(type) ? Union(FromRest7(type.anyOf)) : IsObject3(type) ? FromObject17(type, type.properties) : (
      // Intrinsic
      IsBigInt3(type) ? type : IsBoolean3(type) ? type : IsInteger2(type) ? type : IsLiteral(type) ? type : IsNull3(type) ? type : IsNumber3(type) ? type : IsString3(type) ? type : IsSymbol3(type) ? type : IsUndefined3(type) ? type : (
        // Passthrough
        Object2({})
      )
    )
  );
}
function Required(type, options) {
  if (IsMappedResult(type)) {
    return RequiredFromMappedResult(type, options);
  } else {
    return CreateType({ ...RequiredResolve(type), ...options });
  }
}

// node_modules/@sinclair/typebox/build/esm/type/required/required-from-mapped-result.mjs
function FromProperties19(P, options) {
  const Acc = {};
  for (const K2 of globalThis.Object.getOwnPropertyNames(P))
    Acc[K2] = Required(P[K2], options);
  return Acc;
}
function FromMappedResult12(R, options) {
  return FromProperties19(R.properties, options);
}
function RequiredFromMappedResult(R, options) {
  const P = FromMappedResult12(R, options);
  return MappedResult(P);
}

// node_modules/@sinclair/typebox/build/esm/type/module/compute.mjs
function DereferenceParameters(moduleProperties, types) {
  return types.map((type) => {
    return IsRef(type) ? Dereference(moduleProperties, type.$ref) : FromType2(moduleProperties, type);
  });
}
function Dereference(moduleProperties, ref) {
  return ref in moduleProperties ? IsRef(moduleProperties[ref]) ? Dereference(moduleProperties, moduleProperties[ref].$ref) : FromType2(moduleProperties, moduleProperties[ref]) : Never();
}
function FromAwaited(parameters) {
  return Awaited(parameters[0]);
}
function FromIndex(parameters) {
  return Index(parameters[0], parameters[1]);
}
function FromKeyOf(parameters) {
  return KeyOf(parameters[0]);
}
function FromPartial(parameters) {
  return Partial(parameters[0]);
}
function FromOmit(parameters) {
  return Omit(parameters[0], parameters[1]);
}
function FromPick(parameters) {
  return Pick(parameters[0], parameters[1]);
}
function FromRequired(parameters) {
  return Required(parameters[0]);
}
function FromComputed5(moduleProperties, target, parameters) {
  const dereferenced = DereferenceParameters(moduleProperties, parameters);
  return target === "Awaited" ? FromAwaited(dereferenced) : target === "Index" ? FromIndex(dereferenced) : target === "KeyOf" ? FromKeyOf(dereferenced) : target === "Partial" ? FromPartial(dereferenced) : target === "Omit" ? FromOmit(dereferenced) : target === "Pick" ? FromPick(dereferenced) : target === "Required" ? FromRequired(dereferenced) : Never();
}
function FromArray17(moduleProperties, type) {
  return Array2(FromType2(moduleProperties, type));
}
function FromAsyncIterator7(moduleProperties, type) {
  return AsyncIterator(FromType2(moduleProperties, type));
}
function FromConstructor8(moduleProperties, parameters, instanceType) {
  return Constructor(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, instanceType));
}
function FromFunction7(moduleProperties, parameters, returnType) {
  return Function(FromTypes2(moduleProperties, parameters), FromType2(moduleProperties, returnType));
}
function FromIntersect18(moduleProperties, types) {
  return Intersect(FromTypes2(moduleProperties, types));
}
function FromIterator7(moduleProperties, type) {
  return Iterator(FromType2(moduleProperties, type));
}
function FromObject18(moduleProperties, properties) {
  return Object2(globalThis.Object.keys(properties).reduce((result, key) => {
    return { ...result, [key]: FromType2(moduleProperties, properties[key]) };
  }, {}));
}
function FromRecord13(moduleProperties, type) {
  const [value2, pattern] = [FromType2(moduleProperties, RecordValue2(type)), RecordPattern(type)];
  const result = CloneType(type);
  result.patternProperties[pattern] = value2;
  return result;
}
function FromTransform(moduleProperties, transform) {
  return IsRef(transform) ? { ...Dereference(moduleProperties, transform.$ref), [TransformKind]: transform[TransformKind] } : transform;
}
function FromTuple15(moduleProperties, types) {
  return Tuple(FromTypes2(moduleProperties, types));
}
function FromUnion20(moduleProperties, types) {
  return Union(FromTypes2(moduleProperties, types));
}
function FromTypes2(moduleProperties, types) {
  return types.map((type) => FromType2(moduleProperties, type));
}
function FromType2(moduleProperties, type) {
  return (
    // Modifiers
    IsOptional(type) ? CreateType(FromType2(moduleProperties, Discard(type, [OptionalKind])), type) : IsReadonly(type) ? CreateType(FromType2(moduleProperties, Discard(type, [ReadonlyKind])), type) : (
      // Transform
      IsTransform(type) ? CreateType(FromTransform(moduleProperties, type), type) : (
        // Types
        IsArray3(type) ? CreateType(FromArray17(moduleProperties, type.items), type) : IsAsyncIterator3(type) ? CreateType(FromAsyncIterator7(moduleProperties, type.items), type) : IsComputed(type) ? CreateType(FromComputed5(moduleProperties, type.target, type.parameters)) : IsConstructor(type) ? CreateType(FromConstructor8(moduleProperties, type.parameters, type.returns), type) : IsFunction3(type) ? CreateType(FromFunction7(moduleProperties, type.parameters, type.returns), type) : IsIntersect(type) ? CreateType(FromIntersect18(moduleProperties, type.allOf), type) : IsIterator3(type) ? CreateType(FromIterator7(moduleProperties, type.items), type) : IsObject3(type) ? CreateType(FromObject18(moduleProperties, type.properties), type) : IsRecord(type) ? CreateType(FromRecord13(moduleProperties, type)) : IsTuple(type) ? CreateType(FromTuple15(moduleProperties, type.items || []), type) : IsUnion(type) ? CreateType(FromUnion20(moduleProperties, type.anyOf), type) : type
      )
    )
  );
}
function ComputeType(moduleProperties, key) {
  return key in moduleProperties ? FromType2(moduleProperties, moduleProperties[key]) : Never();
}
function ComputeModuleProperties(moduleProperties) {
  return globalThis.Object.getOwnPropertyNames(moduleProperties).reduce((result, key) => {
    return { ...result, [key]: ComputeType(moduleProperties, key) };
  }, {});
}

// node_modules/@sinclair/typebox/build/esm/type/module/module.mjs
var TModule = class {
  constructor($defs) {
    const computed = ComputeModuleProperties($defs);
    const identified = this.WithIdentifiers(computed);
    this.$defs = identified;
  }
  /** `[Json]` Imports a Type by Key. */
  Import(key, options) {
    const $defs = { ...this.$defs, [key]: CreateType(this.$defs[key], options) };
    return CreateType({ [Kind]: "Import", $defs, $ref: key });
  }
  // prettier-ignore
  WithIdentifiers($defs) {
    return globalThis.Object.getOwnPropertyNames($defs).reduce((result, key) => {
      return { ...result, [key]: { ...$defs[key], $id: key } };
    }, {});
  }
};
function Module(properties) {
  return new TModule(properties);
}

// node_modules/@sinclair/typebox/build/esm/type/not/not.mjs
function Not2(type, options) {
  return CreateType({ [Kind]: "Not", not: type }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/parameters/parameters.mjs
function Parameters(schema, options) {
  return IsFunction3(schema) ? Tuple(schema.parameters, options) : Never();
}

// node_modules/@sinclair/typebox/build/esm/type/recursive/recursive.mjs
var Ordinal = 0;
function Recursive(callback, options = {}) {
  if (IsUndefined2(options.$id))
    options.$id = `T${Ordinal++}`;
  const thisType = CloneType(callback({ [Kind]: "This", $ref: `${options.$id}` }));
  thisType.$id = options.$id;
  return CreateType({ [Hint]: "Recursive", ...thisType }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/regexp/regexp.mjs
function RegExp2(unresolved, options) {
  const expr = IsString2(unresolved) ? new globalThis.RegExp(unresolved) : unresolved;
  return CreateType({ [Kind]: "RegExp", type: "RegExp", source: expr.source, flags: expr.flags }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/rest/rest.mjs
function RestResolve(T) {
  return IsIntersect(T) ? T.allOf : IsUnion(T) ? T.anyOf : IsTuple(T) ? T.items ?? [] : [];
}
function Rest(T) {
  return RestResolve(T);
}

// node_modules/@sinclair/typebox/build/esm/type/return-type/return-type.mjs
function ReturnType(schema, options) {
  return IsFunction3(schema) ? CreateType(schema.returns, options) : Never(options);
}

// node_modules/@sinclair/typebox/build/esm/type/transform/transform.mjs
var TransformDecodeBuilder = class {
  constructor(schema) {
    this.schema = schema;
  }
  Decode(decode) {
    return new TransformEncodeBuilder(this.schema, decode);
  }
};
var TransformEncodeBuilder = class {
  constructor(schema, decode) {
    this.schema = schema;
    this.decode = decode;
  }
  EncodeTransform(encode, schema) {
    const Encode2 = (value2) => schema[TransformKind].Encode(encode(value2));
    const Decode2 = (value2) => this.decode(schema[TransformKind].Decode(value2));
    const Codec = { Encode: Encode2, Decode: Decode2 };
    return { ...schema, [TransformKind]: Codec };
  }
  EncodeSchema(encode, schema) {
    const Codec = { Decode: this.decode, Encode: encode };
    return { ...schema, [TransformKind]: Codec };
  }
  Encode(encode) {
    return IsTransform(this.schema) ? this.EncodeTransform(encode, this.schema) : this.EncodeSchema(encode, this.schema);
  }
};
function Transform(schema) {
  return new TransformDecodeBuilder(schema);
}

// node_modules/@sinclair/typebox/build/esm/type/void/void.mjs
function Void(options) {
  return CreateType({ [Kind]: "Void", type: "void" }, options);
}

// node_modules/@sinclair/typebox/build/esm/type/type/type.mjs
var type_exports3 = {};
__export(type_exports3, {
  Any: () => Any,
  Argument: () => Argument,
  Array: () => Array2,
  AsyncIterator: () => AsyncIterator,
  Awaited: () => Awaited,
  BigInt: () => BigInt2,
  Boolean: () => Boolean,
  Capitalize: () => Capitalize,
  Composite: () => Composite,
  Const: () => Const,
  Constructor: () => Constructor,
  ConstructorParameters: () => ConstructorParameters,
  Date: () => Date2,
  Enum: () => Enum,
  Exclude: () => Exclude,
  Extends: () => Extends,
  Extract: () => Extract,
  Function: () => Function,
  Index: () => Index,
  InstanceType: () => InstanceType,
  Instantiate: () => Instantiate,
  Integer: () => Integer,
  Intersect: () => Intersect,
  Iterator: () => Iterator,
  KeyOf: () => KeyOf,
  Literal: () => Literal,
  Lowercase: () => Lowercase,
  Mapped: () => Mapped,
  Module: () => Module,
  Never: () => Never,
  Not: () => Not2,
  Null: () => Null,
  Number: () => Number2,
  Object: () => Object2,
  Omit: () => Omit,
  Optional: () => Optional,
  Parameters: () => Parameters,
  Partial: () => Partial,
  Pick: () => Pick,
  Promise: () => Promise2,
  Readonly: () => Readonly,
  ReadonlyOptional: () => ReadonlyOptional,
  Record: () => Record,
  Recursive: () => Recursive,
  Ref: () => Ref,
  RegExp: () => RegExp2,
  Required: () => Required,
  Rest: () => Rest,
  ReturnType: () => ReturnType,
  String: () => String2,
  Symbol: () => Symbol2,
  TemplateLiteral: () => TemplateLiteral,
  Transform: () => Transform,
  Tuple: () => Tuple,
  Uint8Array: () => Uint8Array2,
  Uncapitalize: () => Uncapitalize,
  Undefined: () => Undefined,
  Union: () => Union,
  Unknown: () => Unknown,
  Unsafe: () => Unsafe,
  Uppercase: () => Uppercase,
  Void: () => Void
});

// node_modules/@sinclair/typebox/build/esm/type/type/index.mjs
var Type = type_exports3;

// plugins/omlx-media/src/omlx-client.ts
import { readFile as readFile2 } from "node:fs/promises";
import * as path2 from "node:path";

// plugins/omlx-media/src/workspace-artifacts.ts
import * as path from "node:path";
import { access, mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".png", ".jpg", ".jpeg", ".webp"]);
var NodeCodeError = Type.Object({ code: Type.Optional(Type.String()) });
function errorCode(error) {
  return error instanceof Error && value_exports2.Check(NodeCodeError, error) ? error.code : void 0;
}
function requireAbsolutePath(value2) {
  if (!path.isAbsolute(value2)) {
    throw new OmlxToolError("ABSOLUTE_PATH_REQUIRED", `Path must be absolute: ${value2}`);
  }
  return path.resolve(value2);
}
async function resolveImageInput(value2) {
  const candidate = requireAbsolutePath(value2);
  let resolved;
  try {
    resolved = await realpath(candidate);
    const fileStat = await stat(resolved);
    if (!fileStat.isFile()) throw new Error("not a file");
  } catch {
    throw new OmlxToolError("INPUT_NOT_FOUND", `Image input was not found: ${value2}`);
  }
  if (!IMAGE_EXTENSIONS.has(path.extname(resolved).toLowerCase())) {
    throw new OmlxToolError("UNSUPPORTED_IMAGE", `Image input must be PNG, JPEG, or WebP: ${value2}`);
  }
  return resolved;
}
function outputForIndex(base, index, count) {
  if (count === 1) return base;
  const extension = path.extname(base) || ".png";
  return path.join(path.dirname(base), `${path.basename(base, path.extname(base))}_${index}${extension}`);
}
async function planImageOutputs(requestedOutput, count) {
  const base = requireAbsolutePath(requestedOutput);
  if (path.extname(base).toLowerCase() !== ".png") {
    throw new OmlxToolError("INVALID_OUTPUT", "Image output must use a .png extension");
  }
  const outputs = Array.from({ length: count }, (_, index) => outputForIndex(base, index, count));
  for (const output of outputs) {
    await mkdir(path.dirname(output), { recursive: true });
    try {
      await access(output, fsConstants.F_OK);
      throw new OmlxToolError("OUTPUT_CONFLICT", `Image output already exists: ${output}`);
    } catch (error) {
      if (error instanceof OmlxToolError) throw error;
      if (!(error instanceof Error) || errorCode(error) !== "ENOENT") throw error;
    }
  }
  return outputs;
}
async function readImageDataUri(filePath) {
  const mimeType = path.extname(filePath).toLowerCase() === ".png" ? "image/png" : path.extname(filePath).toLowerCase() === ".webp" ? "image/webp" : "image/jpeg";
  const encoded = (await readFile(filePath)).toString("base64");
  return `data:${mimeType};base64,${encoded}`;
}
async function persistImages(outputs, images) {
  if (outputs.length !== images.length) {
    throw new OmlxToolError("INVALID_RESPONSE", "OMLX returned an unexpected number of images");
  }
  const committed = [];
  try {
    for (let index = 0; index < outputs.length; index++) {
      if (images[index].length === 0) {
        throw new OmlxToolError("EMPTY_IMAGE", `OMLX returned an empty image at index ${index}`);
      }
      try {
        await writeFile(outputs[index], images[index], { flag: "wx" });
      } catch (error) {
        if (error instanceof Error && errorCode(error) === "EEXIST") {
          throw new OmlxToolError(
            "OUTPUT_CONFLICT",
            `Image output already exists: ${outputs[index]}`
          );
        }
        try {
          await rm(outputs[index], { force: true });
        } catch (cleanupError) {
          throw new OmlxToolError(
            "OUTPUT_CLEANUP_FAILED",
            `Failed to remove incomplete image output ${outputs[index]}: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`
          );
        }
        throw error;
      }
      committed.push(outputs[index]);
    }
  } catch (error) {
    await Promise.allSettled(committed.map((file) => rm(file, { force: true })));
    throw error;
  }
}

// plugins/omlx-media/src/omlx-client.ts
var REQUEST_TIMEOUT_MS = 3e5;
var JsonValueSchema = Type.Recursive(
  (self) => Type.Union([
    Type.Boolean(),
    Type.Null(),
    Type.Number(),
    Type.String(),
    Type.Array(self),
    Type.Record(Type.String(), self)
  ])
);
var StringSchema = Type.String();
var ModelPayloadSchema = Type.Object({
  id: Type.String(),
  loaded: Type.Optional(Type.Boolean()),
  status: Type.Optional(Type.String()),
  engine_type: Type.Optional(Type.String()),
  model_type: Type.Optional(Type.String()),
  config_model_type: Type.Optional(Type.String()),
  capabilities: Type.Optional(JsonValueSchema),
  tasks: Type.Optional(JsonValueSchema)
});
var ModelStatusSchema = Type.Object({
  models: Type.Array(JsonValueSchema)
});
var ErrorEnvelopeSchema = Type.Object({
  error: JsonValueSchema
});
var ErrorMessageSchema = Type.Object({
  message: Type.String()
});
var ImageResponseSchema = Type.Object({
  data: Type.Array(JsonValueSchema, { minItems: 1 })
});
var ImageDataSchema = Type.Object({
  b64_json: Type.Optional(Type.String()),
  url: Type.Optional(Type.String())
});
var TranscriptionResponseSchema = Type.Object({
  text: Type.String()
});
var GENERATION_CAPABILITIES = /* @__PURE__ */ new Set([
  "generate",
  "generation",
  "image-generation",
  "image_generation",
  "text-to-image",
  "text_to_image"
]);
var EDIT_CAPABILITIES = /* @__PURE__ */ new Set([
  "edit",
  "editing",
  "image-edit",
  "image_edit",
  "image-to-image",
  "image_to_image"
]);
function stringsFrom(value2) {
  if (value_exports2.Check(StringSchema, value2)) return [value2.toLowerCase()];
  if (!Array.isArray(value2)) return [];
  return value2.flatMap(
    (item) => value_exports2.Check(StringSchema, item) ? [item.toLowerCase()] : []
  );
}
function parseLoaded(model) {
  if (model.loaded !== void 0) return model.loaded;
  if (model.status !== void 0) {
    return ["loaded", "ready", "running"].includes(model.status.toLowerCase());
  }
  return true;
}
function parseModel(value2) {
  if (!value_exports2.Check(ModelPayloadSchema, value2)) return null;
  const capabilities = /* @__PURE__ */ new Set([
    ...stringsFrom(value2.capabilities),
    ...stringsFrom(value2.tasks)
  ]);
  const image = value2.engine_type?.toLowerCase() === "image" || value2.model_type?.toLowerCase() === "image" || [...capabilities].some(
    (capability) => GENERATION_CAPABILITIES.has(capability) || EDIT_CAPABILITIES.has(capability)
  );
  return {
    id: value2.id,
    image,
    loaded: parseLoaded(value2),
    capabilities,
    modelType: value2.model_type?.toLowerCase(),
    engineType: value2.engine_type?.toLowerCase(),
    configModelType: value2.config_model_type?.toLowerCase()
  };
}
function supports(model, operation2) {
  const expected = operation2 === "generate" ? GENERATION_CAPABILITIES : EDIT_CAPABILITIES;
  if ([...model.capabilities].some((capability) => expected.has(capability))) return true;
  return model.image;
}
function responseErrorMessage(payload) {
  if (!value_exports2.Check(ErrorEnvelopeSchema, payload)) return null;
  if (value_exports2.Check(StringSchema, payload.error)) return payload.error;
  if (value_exports2.Check(ErrorMessageSchema, payload.error)) {
    return payload.error.message;
  }
  return "OMLX returned an error";
}
function requestErrorCode(status) {
  return status === 401 || status === 403 ? "AUTHENTICATION_FAILED" : "OMLX_REQUEST_FAILED";
}
var OmlxClient = class {
  baseUrl;
  apiKey;
  fetchImplementation;
  constructor(environment, fetchImplementation = fetch) {
    this.baseUrl = (environment.OMLX_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
    this.apiKey = environment.OMLX_API_KEY;
    this.fetchImplementation = fetchImplementation;
  }
  headers(json) {
    const headers = {};
    if (json) headers["Content-Type"] = "application/json";
    if (this.apiKey) headers.Authorization = `Bearer ${this.apiKey}`;
    return headers;
  }
  async request(url, init) {
    let response;
    try {
      response = await this.fetchImplementation(url, {
        ...init,
        signal: init.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
      });
    } catch (error) {
      throw new OmlxToolError(
        "OMLX_UNREACHABLE",
        `Could not reach OMLX at ${this.baseUrl}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
    if (!response.ok) {
      const text = await response.text();
      let message = response.statusText || `HTTP ${response.status}`;
      try {
        const parsed = value_exports2.Parse(JsonValueSchema, JSON.parse(text));
        message = responseErrorMessage(parsed) || message;
        if (value_exports2.Check(Type.Object({ detail: Type.String() }), parsed)) message = parsed.detail;
      } catch {
      }
      throw new OmlxToolError(
        requestErrorCode(response.status),
        `OMLX request failed (${response.status}): ${message}`
      );
    }
    return response;
  }
  async requestJson(url, init) {
    const response = await this.request(url, init);
    const text = await response.text();
    let payload;
    try {
      payload = text ? value_exports2.Parse(JsonValueSchema, JSON.parse(text)) : {};
    } catch {
      throw new OmlxToolError("INVALID_RESPONSE", `OMLX returned invalid JSON (${response.status})`);
    }
    const apiError = responseErrorMessage(payload);
    if (apiError) {
      const message = apiError || response.statusText || `HTTP ${response.status}`;
      throw new OmlxToolError(
        requestErrorCode(response.status),
        `OMLX request failed (${response.status}): ${message}`
      );
    }
    return payload;
  }
  async models() {
    const payload = await this.requestJson(`${this.baseUrl}/v1/models/status`, {
      method: "GET",
      headers: this.headers(false)
    });
    if (!value_exports2.Check(ModelStatusSchema, payload)) {
      throw new OmlxToolError("INVALID_MODEL_STATUS", "OMLX model status did not contain a models array");
    }
    return payload.models.flatMap((model) => {
      const parsed = parseModel(model);
      return parsed ? [parsed] : [];
    });
  }
  async selectModel(operation2, requestedModel) {
    let models;
    try {
      models = await this.models();
    } catch (error) {
      if (requestedModel?.trim() && error instanceof OmlxToolError && ["INVALID_MODEL_STATUS", "OMLX_REQUEST_FAILED"].includes(error.code)) {
        return requestedModel.trim();
      }
      throw error;
    }
    if (requestedModel?.trim()) {
      const requested = models.find((model) => model.id === requestedModel.trim());
      if (!requested) {
        throw new OmlxToolError("MODEL_NOT_FOUND", `OMLX model was not found: ${requestedModel}`);
      }
      if (!requested.loaded) {
        throw new OmlxToolError("MODEL_NOT_LOADED", `OMLX model is not loaded: ${requestedModel}`);
      }
      if (!supports(requested, operation2)) {
        throw new OmlxToolError(
          "MODEL_CAPABILITY_MISMATCH",
          `OMLX model does not support image ${operation2}: ${requestedModel}`
        );
      }
      return requested.id;
    }
    const candidates = models.filter(
      (model) => model.loaded && model.image && supports(model, operation2)
    );
    if (candidates.length === 0) {
      throw new OmlxToolError(
        "NO_CAPABLE_MODEL",
        `No loaded OMLX model supports image ${operation2}`
      );
    }
    return candidates[0].id;
  }
  async selectAudioModel(operation2, requestedModel) {
    const requested = requestedModel?.trim();
    if (requestedModel !== void 0 && !requested) {
      throw new OmlxToolError("INVALID_MODEL", "Audio model must not be empty");
    }
    let models;
    try {
      models = await this.models();
    } catch (error) {
      if (requested && error instanceof OmlxToolError && ["INVALID_MODEL_STATUS", "OMLX_REQUEST_FAILED"].includes(error.code)) {
        return requested;
      }
      throw error;
    }
    const matches = (model2) => {
      const kind = operation2 === "speech" ? "audio_tts" : "audio_stt";
      return model2.modelType === kind || model2.engineType === kind || (operation2 === "speech" ? model2.configModelType?.includes("tts") === true : model2.configModelType?.includes("asr") === true || model2.configModelType?.includes("stt") === true || model2.configModelType?.includes("whisper") === true);
    };
    if (requested) {
      const model2 = models.find((item) => item.id === requested);
      if (!model2) throw new OmlxToolError("MODEL_NOT_FOUND", `OMLX model was not found: ${requested}`);
      if (!matches(model2)) {
        throw new OmlxToolError("MODEL_CAPABILITY_MISMATCH", `OMLX model does not support audio ${operation2}: ${requested}`);
      }
      return model2.id;
    }
    const model = models.find((item) => item.loaded && matches(item)) ?? models.find(matches);
    if (!model) throw new OmlxToolError("NO_CAPABLE_MODEL", `No OMLX model supports audio ${operation2}`);
    return model.id;
  }
  async speech(args, model) {
    const response = await this.request(`${this.baseUrl}/v1/audio/speech`, {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify({
        model,
        input: args.input,
        voice: args.voice,
        language: args.language,
        speed: args.speed,
        instructions: args.instructions,
        response_format: args.response_format ?? "wav"
      })
    });
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.startsWith("audio/") && contentType !== "application/octet-stream") {
      throw new OmlxToolError("INVALID_RESPONSE", `OMLX speech response was not audio: ${contentType || "missing content type"}`);
    }
    const audio = Buffer.from(await response.arrayBuffer());
    if (!audio.length) throw new OmlxToolError("INVALID_RESPONSE", "OMLX returned empty speech audio");
    return audio;
  }
  async transcribe(args, model) {
    const form = new FormData();
    form.set("model", model);
    form.set("response_format", "json");
    if (args.language) form.set("language", args.language);
    if (args.prompt) form.set("prompt", args.prompt);
    form.set("file", new Blob([await readFile2(args.input)]), path2.basename(args.input));
    const payload = await this.requestJson(`${this.baseUrl}/v1/audio/transcriptions`, {
      method: "POST",
      headers: this.headers(false),
      body: form
    });
    if (!value_exports2.Check(TranscriptionResponseSchema, payload)) {
      throw new OmlxToolError("INVALID_RESPONSE", "OMLX transcription response did not contain text");
    }
    return payload.text;
  }
  async render(request) {
    const body = {
      prompt: request.prompt,
      model: request.model,
      n: request.variants,
      response_format: "b64_json"
    };
    if (request.size) body.size = request.size;
    if (request.operation === "generate") {
      body.quality = request.advanced?.quality ?? "standard";
      body.style = request.advanced?.style ?? "vivid";
    } else {
      body.images = await Promise.all(
        request.sourcePaths.map(async (sourcePath) => ({ image_url: await readImageDataUri(sourcePath) }))
      );
      if (request.maskPath) {
        body.mask = { image_url: await readImageDataUri(request.maskPath) };
      }
      if (request.strength !== void 0) body.image_strength = request.strength;
      if (request.advanced?.steps !== void 0) body.steps = request.advanced.steps;
      if (request.advanced?.guidance !== void 0) body.guidance = request.advanced.guidance;
    }
    const endpoint = request.operation === "generate" ? "/v1/images/generations" : "/v1/images/edits";
    const payload = await this.requestJson(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.headers(true),
      body: JSON.stringify(body)
    });
    if (!value_exports2.Check(ImageResponseSchema, payload)) {
      throw new OmlxToolError("INVALID_RESPONSE", "OMLX image response did not contain image data");
    }
    return Promise.all(payload.data.map((item, index) => this.decodeImage(item, index)));
  }
  async decodeImage(item, index) {
    if (!value_exports2.Check(ImageDataSchema, item)) {
      throw new OmlxToolError("INVALID_RESPONSE", `OMLX image data ${index} was invalid`);
    }
    if (item.b64_json !== void 0) {
      return Buffer.from(item.b64_json, "base64");
    }
    if (item.url !== void 0) {
      let response;
      try {
        const target = new URL(item.url);
        const base = new URL(this.baseUrl);
        response = await this.fetchImplementation(target, {
          headers: target.origin === base.origin ? this.headers(false) : void 0,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
        });
      } catch (error) {
        throw new OmlxToolError(
          "IMAGE_DOWNLOAD_FAILED",
          `Could not download OMLX image ${index}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      if (!response.ok) {
        throw new OmlxToolError(
          "IMAGE_DOWNLOAD_FAILED",
          `Could not download OMLX image ${index} (${response.status})`
        );
      }
      return Buffer.from(await response.arrayBuffer());
    }
    throw new OmlxToolError(
      "INVALID_RESPONSE",
      `OMLX image data ${index} contained neither b64_json nor url`
    );
  }
};

// plugins/omlx-media/src/execute-image.ts
function imageSize(value2) {
  if (!value2) return void 0;
  if (value2 === "square") return "1024x1024";
  if (value2 === "portrait") return "1024x1792";
  if (value2 === "landscape") return "1792x1024";
  if (value2 === "auto") return "auto";
  if (!/^[1-9]\d*x[1-9]\d*$/.test(value2)) {
    throw new OmlxToolError("INVALID_SIZE", `Invalid image size: ${value2}`);
  }
  return value2;
}
function validateArgs(args) {
  const prompt = args.prompt?.trim();
  if (!prompt) throw new OmlxToolError("INVALID_PROMPT", "Image prompt must not be empty");
  const operation2 = args.sources?.length ? "edit" : "generate";
  const variants = args.variants ?? 1;
  if (!Number.isInteger(variants) || variants < 1 || variants > 4) {
    throw new OmlxToolError("INVALID_VARIANTS", "Image variants must be between 1 and 4");
  }
  if (operation2 === "generate" && (args.mask || args.strength !== void 0)) {
    throw new OmlxToolError("EDIT_OPTIONS_WITHOUT_SOURCES", "Mask and strength require source images");
  }
  if (operation2 === "generate" && (args.advanced?.steps !== void 0 || args.advanced?.guidance !== void 0)) {
    throw new OmlxToolError("EDIT_OPTIONS_WITHOUT_SOURCES", "Steps and guidance require source images");
  }
  if (operation2 === "edit" && (args.advanced?.quality || args.advanced?.style)) {
    throw new OmlxToolError("GENERATION_OPTIONS_WITH_SOURCES", "Quality and style are generation-only options");
  }
  if (args.strength !== void 0 && (!Number.isFinite(args.strength) || args.strength < 0 || args.strength > 1)) {
    throw new OmlxToolError("INVALID_STRENGTH", "Image strength must be between 0 and 1");
  }
  if (args.advanced?.steps !== void 0 && (!Number.isInteger(args.advanced.steps) || args.advanced.steps < 1)) {
    throw new OmlxToolError("INVALID_STEPS", "Image steps must be a positive integer");
  }
  if (args.advanced?.guidance !== void 0 && (!Number.isFinite(args.advanced.guidance) || args.advanced.guidance < 0)) {
    throw new OmlxToolError("INVALID_GUIDANCE", "Image guidance must be zero or greater");
  }
  return { operation: operation2, prompt, variants };
}
async function executeImage(args, dependencies = {}) {
  const { operation: operation2, prompt, variants } = validateArgs(args);
  const sourcePaths = await Promise.all(
    (args.sources ?? []).map(resolveImageInput)
  );
  const maskPath = args.mask ? await resolveImageInput(args.mask) : void 0;
  const outputs = await planImageOutputs(args.output, variants);
  const client2 = new OmlxClient(
    dependencies.environment ?? process.env,
    dependencies.fetchImplementation ?? fetch
  );
  const model = await client2.selectModel(operation2, args.model);
  const images = await client2.render({
    operation: operation2,
    prompt,
    model,
    sourcePaths,
    maskPath,
    size: imageSize(args.size),
    variants,
    strength: args.strength,
    advanced: args.advanced
  });
  await persistImages(outputs, images);
  return {
    operation: operation2,
    model,
    files: outputs
  };
}

// plugins/omlx-media/src/execute-audio.ts
import * as path3 from "node:path";
import { access as access2, mkdir as mkdir2, open, rm as rm2, stat as stat2 } from "node:fs/promises";
import { constants as fsConstants2 } from "node:fs";
var SPEECH_FORMATS = /* @__PURE__ */ new Set(["wav", "mp3", "opus", "flac", "pcm"]);
var MAX_AUDIO_INPUT_BYTES = 100 * 1024 * 1024;
function absolutePath(value2) {
  if (!path3.isAbsolute(value2)) {
    throw new OmlxToolError("ABSOLUTE_PATH_REQUIRED", `Path must be absolute: ${value2}`);
  }
  return path3.resolve(value2);
}
async function outputPath(value2, extension) {
  const output = absolutePath(value2);
  if (path3.extname(output).toLowerCase() !== extension) {
    throw new OmlxToolError("INVALID_OUTPUT", `Audio output must use a ${extension} extension`);
  }
  await mkdir2(path3.dirname(output), { recursive: true });
  try {
    await access2(output, fsConstants2.F_OK);
    throw new OmlxToolError("OUTPUT_CONFLICT", `Output already exists: ${output}`);
  } catch (error) {
    if (error instanceof OmlxToolError) throw error;
    if (!(error instanceof Error) || !("code" in error) || error.code !== "ENOENT") throw error;
  }
  return output;
}
async function saveOutput(output, content) {
  let handle;
  try {
    handle = await open(output, "wx");
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "EEXIST") {
      throw new OmlxToolError("OUTPUT_CONFLICT", `Output already exists: ${output}`);
    }
    throw error;
  }
  try {
    await handle.writeFile(content);
  } catch (error) {
    await handle.close();
    await rm2(output);
    throw error;
  }
  await handle.close();
}
function requireText(value2, name) {
  const trimmed = value2?.trim();
  if (!trimmed) throw new OmlxToolError("INVALID_INPUT", `${name} must not be empty`);
  return trimmed;
}
function client(dependencies) {
  return new OmlxClient(
    dependencies.environment ?? process.env,
    dependencies.fetchImplementation ?? fetch
  );
}
async function executeSpeech(args, dependencies = {}) {
  const input = requireText(args.input, "Speech input");
  const format = args.response_format ?? "wav";
  if (!SPEECH_FORMATS.has(format)) {
    throw new OmlxToolError("INVALID_FORMAT", `Unsupported speech format: ${format}`);
  }
  if (args.speed !== void 0 && (!Number.isFinite(args.speed) || args.speed <= 0)) {
    throw new OmlxToolError("INVALID_SPEED", "Speech speed must be positive");
  }
  const file = await outputPath(args.output, `.${format}`);
  const api = client(dependencies);
  const model = await api.selectAudioModel("speech", args.model);
  const audio = await api.speech({ ...args, input }, model);
  await saveOutput(file, audio);
  return { model, file };
}
async function executeTranscription(args, dependencies = {}) {
  const input = absolutePath(args.input);
  let inputStat;
  try {
    inputStat = await stat2(input);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      throw new OmlxToolError("INPUT_NOT_FOUND", `Audio input was not found: ${input}`);
    }
    throw error;
  }
  if (!inputStat.isFile()) throw new OmlxToolError("INVALID_INPUT", `Audio input is not a file: ${input}`);
  if (!inputStat.size || inputStat.size > MAX_AUDIO_INPUT_BYTES) {
    throw new OmlxToolError("INVALID_INPUT", "Audio input must be nonempty and at most 100 MB");
  }
  const file = await outputPath(args.output, ".txt");
  const api = client(dependencies);
  const model = await api.selectAudioModel("transcription", args.model);
  const text = await api.transcribe({ ...args, input }, model);
  if (!text.trim()) throw new OmlxToolError("INVALID_RESPONSE", "OMLX returned an empty transcription");
  await saveOutput(file, text);
  return { model, file, text };
}

// plugins/omlx-media/src/tool-schemas.ts
var imageParameters = Type.Object({
  prompt: Type.String({ minLength: 1 }),
  output: Type.String({ minLength: 1 }),
  sources: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 })),
  mask: Type.Optional(Type.String({ minLength: 1 })),
  size: Type.Optional(Type.Union([
    Type.Literal("auto"),
    Type.Literal("square"),
    Type.Literal("portrait"),
    Type.Literal("landscape"),
    Type.TemplateLiteral("${number}x${number}")
  ])),
  model: Type.Optional(Type.String({ minLength: 1 })),
  variants: Type.Optional(Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3), Type.Literal(4)])),
  strength: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
  advanced: Type.Optional(Type.Object({
    steps: Type.Optional(Type.Integer({ minimum: 1 })),
    guidance: Type.Optional(Type.Number({ minimum: 0 })),
    quality: Type.Optional(Type.Union([Type.Literal("standard"), Type.Literal("hd"), Type.Literal("quality")])),
    style: Type.Optional(Type.Union([Type.Literal("natural"), Type.Literal("vivid")]))
  }, { additionalProperties: false }))
}, { additionalProperties: false });
var speechParameters = Type.Object({
  input: Type.String({ minLength: 1 }),
  output: Type.String({ minLength: 1 }),
  model: Type.Optional(Type.String({ minLength: 1 })),
  voice: Type.Optional(Type.String()),
  language: Type.Optional(Type.String()),
  speed: Type.Optional(Type.Number({ exclusiveMinimum: 0 })),
  instructions: Type.Optional(Type.String()),
  response_format: Type.Optional(Type.Union([
    Type.Literal("wav"),
    Type.Literal("mp3"),
    Type.Literal("opus"),
    Type.Literal("flac"),
    Type.Literal("pcm")
  ]))
}, { additionalProperties: false });
var transcriptionParameters = Type.Object({
  input: Type.String({ minLength: 1 }),
  output: Type.String({ minLength: 1 }),
  model: Type.Optional(Type.String({ minLength: 1 })),
  language: Type.Optional(Type.String()),
  prompt: Type.Optional(Type.String())
}, { additionalProperties: false });

// plugins/omlx-media/src/media.ts
var [operation, option, value, ...extra] = process.argv.slice(2);
if (["--help", "-h"].includes(operation) || !operation) {
  console.log(`Usage: node <plugin-root>/scripts/media.mjs <image|speech|transcribe> --input-json <file>
       node <plugin-root>/scripts/media.mjs <image|speech|transcribe> --json '<arguments>'

Uses OMLX_BASE_URL (default http://127.0.0.1:8000) and optional OMLX_API_KEY.
Outputs must be new absolute paths. Source files are never modified.
Image: prompt, output (.png), sources?, mask?, size?, model?, variants?, strength?, advanced?
Speech: input (text), output (.wav), model?, voice?, language?, speed?, instructions?, response_format?
Transcribe: input (audio path), output (.txt), model?, language?, prompt?
Results are JSON on stdout. Errors go to stderr with exit code 1.`);
} else {
  try {
    if (!value || extra.length || !["--input-json", "--json"].includes(option)) throw new Error("Use --input-json <file> or --json '<arguments>'; see --help");
    const args = JSON.parse(option === "--input-json" ? await readFile3(value, "utf8") : value);
    let result;
    switch (operation) {
      case "image":
        if (!value_exports2.Check(imageParameters, args)) throw new Error("Invalid image arguments");
        result = await executeImage(args);
        break;
      case "speech":
        if (!value_exports2.Check(speechParameters, args)) throw new Error("Invalid speech arguments");
        result = await executeSpeech(args);
        break;
      case "transcribe":
        if (!value_exports2.Check(transcriptionParameters, args)) throw new Error("Invalid transcription arguments");
        result = await executeTranscription(args);
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
    console.log(JSON.stringify(result));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
