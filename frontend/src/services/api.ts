import axios, { AxiosError } from 'axios';
import { API_ENDPOINTS } from '../constants';
import type { ProcessRequestParams, ProcessResponse, ErrorResponseData } from '../types';

/**
 * 处理 GLB 模型
 * @param params - 处理请求参数
 * @returns 处理响应
 * @throws 抛出包含错误信息的异常
 */
export async function processModel(params: ProcessRequestParams): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append('model', params.model);
  formData.append('tolerance', params.tolerance.toString());
  formData.append('instanceLimit', params.instanceLimit.toString());
  
  if (params.mergeAllGlb) {
    formData.append('mergeAllGlb', 'true');
  }
  
  if (params.meshSegmentation) {
    formData.append('meshSegmentation', 'true');
  }

  try {
    const response = await axios.post<ProcessResponse>(API_ENDPOINTS.PROCESS, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    
    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ErrorResponseData>;
      
      if (axiosError.response) {
        // 服务器响应了错误状态码
        const logs = axiosError.response.data?.logs;
        const logMessage = logs 
          ? `\n\n--- C++ Tool Logs ---\nSTDERR:\n${logs.stderr}\nSTDOUT:\n${logs.stdout}` 
          : '';
        const errorMessage = `Server Error ${axiosError.response.status}: ${axiosError.response.data?.error || 'Internal Server Error'}${logMessage}`;
        throw new Error(errorMessage);
      } else if (axiosError.request) {
        // 请求已发出但没有收到响应
        throw new Error('No response from server. Is the backend running?');
      } else {
        // 请求设置时出错
        throw new Error(`Request setup error: ${axiosError.message}`);
      }
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unknown error occurred.');
    }
  }
}

