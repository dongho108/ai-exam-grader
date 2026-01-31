import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { EXTRACT_EXAM_PROMPT } from './prompts.ts';
import { createProvider } from './providers/index.ts';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  // Authorization 헤더 검증
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const errorResponse = {
      success: false,
      error: 'Authorization 헤더가 필요합니다.',
      code: 'UNAUTHORIZED'
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
  try {
    const body = await req.json();
    // 유효성 검사
    if (!body.images || body.images.length === 0) {
      const errorResponse = {
        success: false,
        error: '시험지 이미지가 필요합니다.',
        code: 'MISSING_IMAGES'
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    console.log(`Processing exam structure extraction with ${body.images.length} images`);
    // LLM 프로바이더로 구조 추출
    const provider = createProvider();
    const structure = await provider.extractStructure(body.images, EXTRACT_EXAM_PROMPT);
    console.log(`Extracted ${structure.totalQuestions} answers for student: ${structure.studentName}`);
    const response = {
      success: true,
      data: structure
    };
    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Extract exam structure error:', error);
    const errorMessage = error instanceof Error ? error.message : '학생 답안 구조 추출 중 오류가 발생했습니다.';
    let errorCode = 'EXTRACTION_ERROR';
    if (errorMessage.includes('API_KEY')) {
      errorCode = 'API_KEY_ERROR';
    } else if (errorMessage.includes('파싱')) {
      errorCode = 'PARSE_ERROR';
    } else if (errorMessage.includes('API 호출')) {
      errorCode = 'API_CALL_ERROR';
    }
    const errorResponse = {
      success: false,
      error: errorMessage,
      code: errorCode
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
