import { FaLinkedin } from 'react-icons/fa';

interface Founder {
  url: string;
  title: string;
}

interface FoundersDisplayProps {
  founders: Founder[];
}

export default function FoundersDisplay({ founders }: FoundersDisplayProps) {
  return (
    <div>
      <h3 className="text-2xl font-normal pb-4">
        Founders
      </h3>
      <div className="bg-pb-surface rounded-none p-6 border border-pb-border mt-6">
        <div className="space-y-4">
          {founders.map((founder, index) => (
            <a
              key={index}
              href={founder.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group"
            >
              <div className="flex items-center space-x-5 p-5 bg-pb-background rounded-lg border border-pb-border hover:bg-pb-surface hover:border-pb-ring hover:shadow-sm transition-all duration-200">
                <div className="flex-shrink-0">
                  <div className="w-[52px] h-[52px] rounded-full bg-gradient-to-br from-pb-primary/20 to-pb-primary/50 flex items-center justify-center">
                    <svg
                      className="w-7 h-7 text-pb-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-medium text-pb-foreground group-hover:text-pb-primary transition-colors duration-200">
                    {founder.title}
                  </p>
                  <div className="inline-flex items-center mt-1 text-sm text-pb-muted group-hover:text-pb-primary transition-colors duration-200">
                    <FaLinkedin className="mr-1.5 text-[15px] opacity-80" />
                    <span>View LinkedIn Profile</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
} 