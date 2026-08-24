"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var supabase_js_1 = require("@supabase/supabase-js");
var SUPABASE_URL = 'http://127.0.0.1:54321';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
var SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var adminClient, progA, progB, pmId, ssId, getAccessToken, pmAuth, ssAuth, pmClient, ssClient, anonClient, patchRes, anonRpc, directUpdate, ssRpc, foreignRpc, forgeRpc, validAuditId, successRpc, failRpc, dateRpc;
        var _this = this;
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
        return __generator(this, function (_o) {
            switch (_o.label) {
                case 0:
                    adminClient = (0, supabase_js_1.createClient)(SUPABASE_URL, SERVICE_KEY);
                    progA = '11111111-1111-1111-1111-111111111111';
                    progB = '22222222-2222-2222-2222-222222222222';
                    pmId = '99999999-9999-9999-9999-999999999991';
                    ssId = '99999999-9999-9999-9999-999999999992';
                    getAccessToken = function (email) { return __awaiter(_this, void 0, void 0, function () {
                        var _a, data, error;
                        var _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0: return [4 /*yield*/, adminClient.auth.signInWithPassword({ email: email, password: 'password123' })];
                                case 1:
                                    _a = _c.sent(), data = _a.data, error = _a.error;
                                    if (error)
                                        throw error;
                                    return [2 /*return*/, { token: (_b = data.session) === null || _b === void 0 ? void 0 : _b.access_token, user: data.user }];
                            }
                        });
                    }); };
                    return [4 /*yield*/, getAccessToken('submitter@jkr.gov.my')];
                case 1:
                    pmAuth = _o.sent();
                    return [4 /*yield*/, getAccessToken('reviewer@jkr.gov.my')];
                case 2:
                    ssAuth = _o.sent();
                    console.log('\n--- Matrix Tests ---');
                    pmClient = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: "Bearer ".concat(pmAuth.token) } } });
                    ssClient = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: "Bearer ".concat(ssAuth.token) } } });
                    anonClient = (0, supabase_js_1.createClient)(SUPABASE_URL, SUPABASE_ANON_KEY);
                    return [4 /*yield*/, fetch("".concat(SUPABASE_URL, "/rest/v1/programme?programme_id=eq.").concat(progA), {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
                            body: JSON.stringify({ programme_name: 'Hacked' })
                        })];
                case 3:
                    patchRes = _o.sent();
                    console.log('Anonymous PATCH HTTP:', patchRes.status === 401 ? 'DENIED (401)' : patchRes.status);
                    return [4 /*yield*/, anonClient.rpc('c06_update_programme_atomic', { p_programme_id: progA, p_payload: {}, p_actor_id: pmAuth.user.id, p_audit_id: '00000000-0000-0000-0000-000000000000' })];
                case 4:
                    anonRpc = _o.sent();
                    console.log('Anonymous RPC:', anonRpc.error ? 'DENIED' : 'ALLOWED', (_a = anonRpc.error) === null || _a === void 0 ? void 0 : _a.message);
                    return [4 /*yield*/, pmClient.from('programme').update({ programme_name: 'Hacked' }).eq('programme_id', progA)];
                case 5:
                    directUpdate = _o.sent();
                    console.log('Direct Table UPDATE:', directUpdate.error ? 'DENIED' : 'ALLOWED', (_b = directUpdate.error) === null || _b === void 0 ? void 0 : _b.message);
                    return [4 /*yield*/, ssClient.rpc('c06_update_programme_atomic', { p_programme_id: progA, p_payload: {}, p_actor_id: ssAuth.user.id, p_audit_id: '00000000-0000-0000-0000-000000000001' })];
                case 6:
                    ssRpc = _o.sent();
                    console.log('SS (No Capability) RPC:', ssRpc.error ? 'DENIED' : 'ALLOWED', (_c = ssRpc.error) === null || _c === void 0 ? void 0 : _c.code, (_d = ssRpc.error) === null || _d === void 0 ? void 0 : _d.message);
                    return [4 /*yield*/, pmClient.rpc('c06_update_programme_atomic', { p_programme_id: progB, p_payload: {}, p_actor_id: pmAuth.user.id, p_audit_id: '00000000-0000-0000-0000-000000000002' })];
                case 7:
                    foreignRpc = _o.sent();
                    console.log('Foreign Programme RPC:', foreignRpc.error ? 'DENIED' : 'ALLOWED', (_e = foreignRpc.error) === null || _e === void 0 ? void 0 : _e.code, (_f = foreignRpc.error) === null || _f === void 0 ? void 0 : _f.message);
                    return [4 /*yield*/, pmClient.rpc('c06_update_programme_atomic', { p_programme_id: progA, p_payload: {}, p_actor_id: ssAuth.user.id, p_audit_id: '00000000-0000-0000-0000-000000000003' })];
                case 8:
                    forgeRpc = _o.sent();
                    console.log('Actor Forgery RPC:', forgeRpc.error ? 'DENIED' : 'ALLOWED', (_g = forgeRpc.error) === null || _g === void 0 ? void 0 : _g.code, (_h = forgeRpc.error) === null || _h === void 0 ? void 0 : _h.message);
                    validAuditId = crypto.randomUUID();
                    return [4 /*yield*/, pmClient.rpc('c06_update_programme_atomic', {
                            p_programme_id: progA,
                            p_payload: { programme_name: 'Updated by PM' },
                            p_actor_id: pmAuth.user.id,
                            p_audit_id: validAuditId
                        })];
                case 9:
                    successRpc = _o.sent();
                    console.log('Authorized Success RPC:', successRpc.error ? 'FAILED' : 'SUCCESS', (_j = successRpc.error) === null || _j === void 0 ? void 0 : _j.message);
                    return [4 /*yield*/, pmClient.rpc('c06_update_programme_atomic', {
                            p_programme_id: progA,
                            p_payload: { programme_name: 'Updated by PM 2' },
                            p_actor_id: pmAuth.user.id,
                            p_audit_id: validAuditId
                        })];
                case 10:
                    failRpc = _o.sent();
                    console.log('Atomic Rollback RPC:', failRpc.error ? 'FAILED AS EXPECTED' : 'SUCCESS', (_k = failRpc.error) === null || _k === void 0 ? void 0 : _k.message);
                    return [4 /*yield*/, pmClient.rpc('c06_update_programme_atomic', {
                            p_programme_id: progA,
                            p_payload: { contract_start_date: '2000-01-01', contract_completion_date: '1999-01-01' },
                            p_actor_id: pmAuth.user.id,
                            p_audit_id: crypto.randomUUID()
                        })];
                case 11:
                    dateRpc = _o.sent();
                    console.log('Date Hierarchy Check:', dateRpc.error ? 'DENIED AS EXPECTED' : 'ALLOWED', (_l = dateRpc.error) === null || _l === void 0 ? void 0 : _l.code, (_m = dateRpc.error) === null || _m === void 0 ? void 0 : _m.message);
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
