export interface Article {
  title: string;
  url: string;
  points: number;
  num_comments: number;
  _tags: string[];
  author: string;
  created_at: string;
}

export interface HNResponse {
  hits: Article[];
}

export interface CreatePostResponse {
  content?: [
    {
      type: "text" | string;
      text: string;
    }
  ];
}
