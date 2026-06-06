import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

export interface Todo {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  user_id: string;
  created_at: string;
  updated_at: string;
}

interface TodoListResponse {
  items: Todo[];
  total: number;
  page: number;
  size: number;
}

interface CreateTodoRequest {
  title: string;
  description?: string;
}

interface UpdateTodoRequest {
  title?: string;
  description?: string;
  completed?: boolean;
}


export function useTodos(page: number = 1, size: number = 10000) {
  return useQuery({
    queryKey: ["todos", { page, size }], // <-- Thêm page, size vào key
    queryFn: async (): Promise<TodoListResponse> => {
      const response = await api.get("/todos", {
        params: { page, size },
      });
      return response.data;
    },
  });
}


export function useCreateTodo() {
  return useMutation({
    mutationFn: async (data: CreateTodoRequest): Promise<Todo> => {
      const response = await api.post("/todos", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Todo created successfully!");
    },
    onError: () => {
      toast.error("Failed to create todo");
    },
  });
}

export function useUpdateTodo() {
  return useMutation<
    Todo,
    Error,
    { id: string; data: UpdateTodoRequest },
    { previousQueries: [any, TodoListResponse | undefined][] } // <-- Đổi kiểu context lưu trữ nhiều query cache
  >({
    mutationFn: async ({
      id,
      data,
    }): Promise<Todo> => {
      const response = await api.put(`/todos/${id}`, data);
      return response.data;
    },
    onMutate: async ({ id, data }) => {
      // Hủy mọi request refetch todos đang chạy để tránh đè dữ liệu
      await queryClient.cancelQueries({ queryKey: ["todos"] });
      // Lấy toàn bộ các cache liên quan đến key ["todos"] (gồm mọi trang)
      const previousQueries = queryClient.getQueriesData<TodoListResponse>({
        queryKey: ["todos"],
      });
      // Cập nhật Optimistic cho tất cả các cache tìm thấy
      previousQueries.forEach(([queryKey, previousTodos]) => {
        if (previousTodos) {
          queryClient.setQueryData<TodoListResponse>(queryKey, {
            ...previousTodos,
            items: previousTodos.items.map((todo) =>
              todo.id === id ? { ...todo, ...data } : todo
            ),
          });
        }
      });
      return { previousQueries };
    },
    onError: (_err, _variables, context) => {
      // Rollback lại tất cả các cache về trạng thái trước khi sửa nếu lỗi
      if (context?.previousQueries) {
        context.previousQueries.forEach(([queryKey, previousTodos]) => {
          queryClient.setQueryData(queryKey, previousTodos);
        });
      }
      toast.error("Failed to update todo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
    },
  });
}


export function useDeleteTodo() {
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["todos"] });
      toast.success("Todo deleted successfully!");
    },
    onError: () => {
      toast.error("Failed to delete todo");
    },
  });
}

export function useToggleTodo() {
  const updateTodo = useUpdateTodo();

  return {
    ...updateTodo,
    mutate: (todo: Todo) => {
      updateTodo.mutate({
        id: todo.id,
        data: { completed: !todo.completed },
      });
    },
  };
}
